import re

with open('frontend/src/app/api/chat/message/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update quota safeguard
quota_old = """    // 1. Quota Safeguard: Check current usage for today (Pacific Time)
    const ptDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const todayStr = ptDate.toISOString().split('T')[0];
    
    const { data: quotaData, error: quotaError } = await supabase
      .from('gemini_quota_tracking')
      .select('requests, input_tokens, output_tokens')
      .eq('date', todayStr)
      .single();

    // If quota tracking row doesn't exist, requests is effectively 0
    let currentRequests = quotaData?.requests || 0;

    if (currentRequests >= 20) {
      return NextResponse.json({ 
        reply: "I've reached my daily limit of questions for today — please try again tomorrow, or click 'Talk to a human' to get help right now.", 
        route: null 
      });
    }"""

quota_new = """    // 1. Quota Safeguard: Check current usage for today (Pacific Time)
    const ptDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const todayStr = ptDate.toISOString().split('T')[0];
    
    const { data: quotaData, error: quotaError } = await supabase
      .from('gemini_quota_tracking')
      .select('model_name, requests, input_tokens, output_tokens')
      .eq('date', todayStr);

    let totalRequests = 0;
    let modelUsage: Record<string, number> = {
      'gemini-2.5-flash-lite': 0,
      'gemini-2.5-flash': 0
    };
    
    if (quotaData) {
      for (const row of quotaData) {
        totalRequests += (row.requests || 0);
        modelUsage[row.model_name] = row.requests || 0;
      }
    }

    // Two models * 20 limit each = 40 total
    if (modelUsage['gemini-2.5-flash-lite'] >= 20 && modelUsage['gemini-2.5-flash'] >= 20) {
      return NextResponse.json({ 
        reply: "I've reached my daily limit of questions for today — please try again tomorrow, or click 'Talk to a human' to get help right now.", 
        route: null 
      });
    }"""
content = content.replace(quota_old, quota_new)

# 2. Cache Check: Did we answer this very recently? (Update threshold to 0.90)
cache_old = """    // 3. Cache Check: Did we answer this very recently?
    const { data: cachedMatch, error: cacheError } = await supabase.rpc('match_chat_cache', {
      query_embedding: embedding,
      match_threshold: 0.92,
      recent_days: 30,
    });"""

cache_new = """    // 3. Cache Check: Did we answer this very recently?
    const { data: cachedMatch, error: cacheError } = await supabase.rpc('match_chat_cache', {
      query_embedding: embedding,
      match_threshold: 0.90, // LOWERED threshold for better cache hit rate
      recent_days: 30,
    });"""
content = content.replace(cache_old, cache_new)

# 3. High confidence threshold (0.79 to 0.74)
high_old = """    if (similarity > 0.79) {"""
high_new = """    if (similarity > 0.74) {"""
content = content.replace(high_old, high_new)

# 4. Soft limit check (18 requests -> 38 aggregate)
soft_old = """    if (currentRequests >= 18) {"""
soft_new = """    if (modelUsage['gemini-2.5-flash-lite'] + modelUsage['gemini-2.5-flash'] >= 38) {"""
content = content.replace(soft_old, soft_new)

# 5. Models to try
models_old = """    const modelsToTry = [
      'gemini-2.5-flash-lite', 
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ];"""

models_new = """    const modelsToTry = [
      'gemini-2.5-flash-lite', 
      'gemini-2.5-flash'
    ];"""
content = content.replace(models_old, models_new)

# 6. Model iteration check individual limits
loop_old = """    for (const modelName of modelsToTry) {
      try {"""

loop_new = """    let usedModel = '';
    for (const modelName of modelsToTry) {
      if (modelUsage[modelName] >= 20) {
        console.log(`Model ${modelName} is at its individual quota limit, skipping...`);
        continue;
      }
      try {"""
content = content.replace(loop_old, loop_new)

# 7. Record usedModel
success_old = """        // Success! Break out of the loop
        console.log(`Successfully generated response using ${modelName}`);
        break;"""

success_new = """        // Success! Break out of the loop
        console.log(`Successfully generated response using ${modelName}`);
        usedModel = modelName;
        break;"""
content = content.replace(success_old, success_new)

# 8. Upsert quota correctly
upsert_old = """      const { error: upsertError } = await supabase
        .from('gemini_quota_tracking')
        .upsert({ 
          date: todayStr, 
          requests: currentRequests + 1,
          input_tokens: ((quotaData as any)?.input_tokens || 0) + inputTokens,
          output_tokens: ((quotaData as any)?.output_tokens || 0) + outputTokens
        });"""

upsert_new = """      // Upsert tracking for the specific model
      const existingModelRow = quotaData?.find((r: any) => r.model_name === usedModel);
      
      const { error: upsertError } = await supabase
        .from('gemini_quota_tracking')
        .upsert({ 
          date: todayStr, 
          model_name: usedModel,
          requests: (existingModelRow?.requests || 0) + 1,
          input_tokens: (existingModelRow?.input_tokens || 0) + inputTokens,
          output_tokens: (existingModelRow?.output_tokens || 0) + outputTokens
        });"""
content = content.replace(upsert_old, upsert_new)

with open('frontend/src/app/api/chat/message/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
