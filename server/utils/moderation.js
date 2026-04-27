const badWords = [
  'đm', 'dm', 'đmm', 'dmm', 'vcl', 'vkl', 'cl', 'cc', 'clgt', 'clm', 'chó', 'mẹ mày', 'bố mày',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'pussy', 'dick'
];

/**
 * Checks if a message contains profanity.
 * @param {string} content 
 * @returns {boolean}
 */
const hasProfanity = (content) => {
  const normalizedContent = content.toLowerCase();
  return badWords.some(word => normalizedContent.includes(word));
};

/**
 * Checks for spamming (repeated messages or too many messages in a short time).
 * This is a simple implementation. In a real scenario, you'd use a more robust
 * approach with Redis or a similar store.
 */
const userMessageHistory = new Map(); // userId -> [{ timestamp, content }]

const isSpamming = (userId, content) => {
  const now = Date.now();
  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, []);
  }

  const history = userMessageHistory.get(userId);
  
  // Clean up old history (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  const recentMessages = history.filter(msg => msg.timestamp > oneMinuteAgo);
  
  // Check for repeated messages
  const isRepeated = recentMessages.some(msg => msg.content === content);
  
  // Check for frequency (e.g., more than 5 messages in 10 seconds)
  const tenSecondsAgo = now - 10000;
  const veryRecentMessages = recentMessages.filter(msg => msg.timestamp > tenSecondsAgo);
  
  const isTooFrequent = veryRecentMessages.length >= 5;

  // Update history
  recentMessages.push({ timestamp: now, content });
  userMessageHistory.set(userId, recentMessages);

  return isRepeated || isTooFrequent;
};

module.exports = {
  hasProfanity,
  isSpamming
};
