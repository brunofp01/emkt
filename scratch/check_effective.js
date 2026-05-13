const { getEffectiveDailyLimit } = require('../src/features/email/lib/warmup-engine');
const limit = getEffectiveDailyLimit(300, 'AQUECIDA', new Date('2023-01-01'));
console.log('Effective Limit for AQUECIDA with old date:', limit);
