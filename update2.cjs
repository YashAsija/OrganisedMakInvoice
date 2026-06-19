const fs = require('fs');

let content = fs.readFileSync('./src/components/BusinessProfileModal.tsx', 'utf8');

// The section starts from `<div className="space-y-4 animate-fade-in text-slate-805 dark:text-white">`
// and ends right before `<div className="grid md:grid-cols-2 gap-4">` (which contains currency symbol and email)

const oldUIBlockRegex = /<div className="grid md:grid-cols-2 gap-4">\s*<div>\s*<label htmlFor="company-name"[\s\S]*?<label htmlFor="company-currency"[\s\S]*?<\/div>\s*<\/div>/;

const newUIBlock = `<div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Business Name</label>
                  <input 
                    id="company-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. INTEZ Systems"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="company-display-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Display Name</label>
                  <input 
                    id="company-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. INTEZ"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-gstin" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">GSTIN / Tax ID</label>
                  <input 
                    id="company-gstin"
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. GSTIN99238"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="company-country" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Country</label>
                  <select 
                    id="company-country"
                    value={Country.getAllCountries().find(c => c.name === country)?.isoCode || ''}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select Country</option>
                    {Country.getAllCountries().map((c) => (
                      <option key={c.isoCode} value={c.isoCode} className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company-state" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State</label>
                  <select 
                    id="company-state"
                    value={stateCode || ''}
                    onChange={(e) => handleStateChange(e.target.value, country)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-500">Select State</option>
                    {(() => {
                      const cCode = Country.getAllCountries().find(c => c.name === country)?.isoCode;
                      if (!cCode) return null;
                      return State.getStatesOfCountry(cCode).map((st) => (
                        <option key={st.isoCode} value={st.isoCode} className="bg-white dark:bg-slate-900 text-slate-805 dark:text-white">{st.name}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label htmlFor="company-state-code" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">State Code</label>
                  <input 
                    id="company-state-code"
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="e.g. MH, 07"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-805 dark:text-white focus:outline-none transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company-address" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Address</label>
                <textarea 
                  id="company-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="abcd, Main Business Block, Silicon Valley"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-sm text-slate-805 dark:text-white focus:outline-none focus:border-sky-500 transition-all resize-none"
                />
              </div>`;

if (oldUIBlockRegex.test(content)) {
    content = content.replace(oldUIBlockRegex, newUIBlock);
    fs.writeFileSync('./src/components/BusinessProfileModal.tsx', content);
    console.log('Successfully updated the UI block.');
} else {
    console.log('Regex did not match the UI block!');
}
