import React from 'react';
import { InvoiceTemplate } from '../../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

interface SortableItemProps {
  id: string;
  section: any;
  onToggleVisibility: (id: string) => void;
}

function SortableItem({ id, section, onToggleVisibility }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-2 group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded text-slate-400 group-hover:text-slate-600 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <span className="text-xs font-bold text-slate-700 capitalize">{id.replace(/([A-Z])/g, ' $1').trim()}</span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(id); }}
        className={`p-1.5 rounded-lg transition-colors ${section.visible ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
      >
        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface StepCanvasProps {
  template: InvoiceTemplate;
  updateSections: (sections: InvoiceTemplate['sections']) => void;
}

export const StepCanvas: React.FC<StepCanvasProps> = ({ template, updateSections }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionsList = Object.values(template.sections).sort((a, b) => a.order - b.order);
  const items = sectionsList.map(s => s.id);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      
      const newSections = { ...template.sections };
      newOrder.forEach((id, index) => {
        newSections[id as keyof typeof newSections].order = index + 1;
      });
      
      updateSections(newSections);
    }
  };

  const handleToggleVisibility = (id: string) => {
    const newSections = { ...template.sections };
    newSections[id as keyof typeof newSections].visible = !newSections[id as keyof typeof newSections].visible;
    updateSections(newSections);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 mb-4">Drag and drop sections to reorder them on the canvas. Use the eye icon to show or hide a section completely.</p>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map(id => (
            <SortableItem 
              key={id} 
              id={id} 
              section={template.sections[id as keyof typeof template.sections]} 
              onToggleVisibility={handleToggleVisibility} 
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
