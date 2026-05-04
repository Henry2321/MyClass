const OpenAI = require("openai");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const badWords = [
  "đụ",
  "địt",
  "lồn",
  "cặc",
  "đéo",
  "vãi",
  "chó",
  "mẹ mày",
  "đmm",
  "vcl",
  "clm",
  "dmm",
  "đm",
  "dm",
  "đmm",
  "dmm",
  "vcl",
  "vkl",
  "cl",
  "cc",
  "clgt",
  "clm",
  "chó",
  "mẹ mày",
  "bố mày",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "pussy",
  "dick",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "faggot",
  "dickhead",
  "motherfucker",
  "son of a bitch",
  "cock",
  "tits",
  "boobs",
  "địt mẹ",
  "địt bố",
  "lồn mẹ",
  "lồn bố",
  "cặc mẹ",
  "cặc bố",
  "đéo mẹ",
  "đéo bố",
  "vãi mẹ",
  "vãi bố",
  "chó mẹ",
  "chó bố",
  "dm mẹ",
  "dm bố",
  "đm mẹ",
  "đm bố",
  "dmm mẹ",
  "dmm bố",
  "vcl mẹ",
  "vcl bố",
  "clm mẹ",
  "clm bố",
  "cc mẹ",
  "cc bố",
  "clgt mẹ",
  "clgt bố",
  "cl mẹ",
  "cl bố",
  "vkl mẹ",
  "vkl bố",
];

const hasProfanityInList = (content) => {
  const normalizedContent = content.toLowerCase();
  return badWords.some((word) => normalizedContent.includes(word));
};

const checkWithOpenAI = async (content) => {
  if (!openai) {
    console.warn("OpenAI API key not provided, skipping AI moderation");
    return false;
  }

  try {
    const response = await openai.moderations.create({
      input: content,
    });

    const result = response.results[0];
    return result.flagged;
  } catch (error) {
    console.error("OpenAI Moderation API error:", error);
    return false;
  }
};

const hasProfanity = async (content) => {
  if (hasProfanityInList(content)) {
    return true;
  }

  return await checkWithOpenAI(content);
};

const userMessageHistory = new Map();
const userWarningCount = new Map();

const isSpamming = (userId, content) => {
  const now = Date.now();
  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, []);
  }

  const history = userMessageHistory.get(userId);

  const oneMinuteAgo = now - 60000;
  const recentMessages = history.filter((msg) => msg.timestamp > oneMinuteAgo);

  const isRepeated = recentMessages.some(
    (msg) => msg.content.toLowerCase() === content.toLowerCase(),
  );

  const tenSecondsAgo = now - 10000;
  const veryRecentMessages = recentMessages.filter(
    (msg) => msg.timestamp > tenSecondsAgo,
  );

  const isTooFrequent = veryRecentMessages.length >= 5;

  recentMessages.push({ timestamp: now, content: content.toLowerCase() });
  userMessageHistory.set(userId, recentMessages);

  return isRepeated || isTooFrequent;
};

const getUserWarningCount = (userId) => {
  return userWarningCount.get(userId) || 0;
};

const incrementUserWarning = (userId) => {
  const currentCount = getUserWarningCount(userId);
  userWarningCount.set(userId, currentCount + 1);
  return currentCount + 1;
};

const resetUserWarnings = (userId) => {
  userWarningCount.delete(userId);
};

module.exports = {
  hasProfanity,
  isSpamming,
  getUserWarningCount,
  incrementUserWarning,
  resetUserWarnings,
};
