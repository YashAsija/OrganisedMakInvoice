const fs = require('fs');

let content = fs.readFileSync('src/components/BusinessProfileModal.tsx', 'utf8');

// Fix mobile numeric input
content = content.replace(
  /onChange=\{\(e\) => setMobile\(e\.target\.value\)\}/g,
  "onChange={(e) => setMobile(e.target.value.replace(/[^\\\\d\\\\s+]/g, ''))}"
);

// We need an additional replace for phone because `setPhone` is used in Country change but wait, 
// the user types in `mobile` not `phone`. Oh wait, there is `mobile` and `phone`. Let me check if there's `setPhone` in an input.
// Just to be sure, I will replace `setPhone` in inputs if it exists.
content = content.replace(
  /onChange=\{\(e\) => setPhone\(e\.target\.value\)\}/g,
  "onChange={(e) => setPhone(e.target.value.replace(/[^\\\\d\\\\s+]/g, ''))}"
);

// Add back buttons
const cancelBtnMatch = `              </button>
            )}
            
            {isOnboarding && activeTab === 'company' && (`;

const replaceWithBackBtns = `              </button>
            )}
            
            {activeTab === 'banking' && (
              <button
                type="button"
                onClick={() => setActiveTab('company')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {activeTab === 'billing' && (
              <button
                type="button"
                onClick={() => setActiveTab('banking')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {activeTab === 'subscription' && (
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 mr-auto"
              >
                Back
              </button>
            )}
            
            {isOnboarding && activeTab === 'company' && (`;

content = content.replace(cancelBtnMatch, replaceWithBackBtns);

fs.writeFileSync('src/components/BusinessProfileModal.tsx', content);
console.log('Update successful');
