import { db } from './config/firebase';
import { ServiceCategory } from './types';

/**
 * Seeds the database with default service categories for rule-based routing.
 * Run with: npm run seed
 */
async function seed() {
  console.log('Seeding default service categories...');

  const categories: Omit<ServiceCategory, 'id'>[] = [
    {
      name: 'Streaming',
      icon: 'movie',
      groupType: 'select',
      description: 'Video streaming services (Netflix, YouTube, Disney+, etc.)',
      order: 1,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        // Netflix
        { type: 'DOMAIN-SUFFIX', value: 'netflix.com' },
        { type: 'DOMAIN-SUFFIX', value: 'netflix.net' },
        { type: 'DOMAIN-SUFFIX', value: 'nflxext.com' },
        { type: 'DOMAIN-SUFFIX', value: 'nflximg.com' },
        { type: 'DOMAIN-SUFFIX', value: 'nflximg.net' },
        { type: 'DOMAIN-SUFFIX', value: 'nflxso.net' },
        { type: 'DOMAIN-SUFFIX', value: 'nflxvideo.net' },
        // YouTube
        { type: 'DOMAIN-SUFFIX', value: 'youtube.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ytimg.com' },
        { type: 'DOMAIN-SUFFIX', value: 'yt.be' },
        { type: 'DOMAIN-SUFFIX', value: 'googlevideo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'youtu.be' },
        { type: 'DOMAIN-SUFFIX', value: 'youtube-nocookie.com' },
        // Disney+
        { type: 'DOMAIN-SUFFIX', value: 'disneyplus.com' },
        { type: 'DOMAIN-SUFFIX', value: 'disney-plus.net' },
        { type: 'DOMAIN-SUFFIX', value: 'disneystreaming.com' },
        { type: 'DOMAIN-SUFFIX', value: 'dssott.com' },
        // HBO Max
        { type: 'DOMAIN-SUFFIX', value: 'hbomax.com' },
        { type: 'DOMAIN-SUFFIX', value: 'hbo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'max.com' },
        // Amazon Prime Video
        { type: 'DOMAIN-SUFFIX', value: 'primevideo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'aiv-cdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'aiv-delivery.net' },
        // Spotify
        { type: 'DOMAIN-SUFFIX', value: 'spotify.com' },
        { type: 'DOMAIN-SUFFIX', value: 'scdn.co' },
        { type: 'DOMAIN-SUFFIX', value: 'spotifycdn.com' },
        // Twitch
        { type: 'DOMAIN-SUFFIX', value: 'twitch.tv' },
        { type: 'DOMAIN-SUFFIX', value: 'twitchcdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'jtvnw.net' },
        // Apple TV+
        { type: 'DOMAIN-SUFFIX', value: 'tv.apple.com' },
        // Bilibili (international)
        { type: 'DOMAIN-SUFFIX', value: 'bilibili.com' },
        { type: 'DOMAIN-SUFFIX', value: 'bilivideo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'biliapi.net' },
      ],
    },
    {
      name: 'Gaming',
      icon: 'sports_esports',
      groupType: 'select',
      description: 'Gaming platforms and services (Steam, Epic, PlayStation, Xbox, etc.)',
      order: 2,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        // Steam
        { type: 'DOMAIN-SUFFIX', value: 'steampowered.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamcommunity.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamstatic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamcontent.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamusercontent.com' },
        { type: 'DOMAIN-KEYWORD', value: 'steam' },
        // Epic Games
        { type: 'DOMAIN-SUFFIX', value: 'epicgames.com' },
        { type: 'DOMAIN-SUFFIX', value: 'unrealengine.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ol.epicgames.com' },
        // EA / Origin
        { type: 'DOMAIN-SUFFIX', value: 'ea.com' },
        { type: 'DOMAIN-SUFFIX', value: 'origin.com' },
        // PlayStation
        { type: 'DOMAIN-SUFFIX', value: 'playstation.com' },
        { type: 'DOMAIN-SUFFIX', value: 'playstation.net' },
        { type: 'DOMAIN-SUFFIX', value: 'sony.com' },
        { type: 'DOMAIN-SUFFIX', value: 'sonyentertainmentnetwork.com' },
        // Xbox
        { type: 'DOMAIN-SUFFIX', value: 'xbox.com' },
        { type: 'DOMAIN-SUFFIX', value: 'xboxlive.com' },
        { type: 'DOMAIN-SUFFIX', value: 'xboxservices.com' },
        // Nintendo
        { type: 'DOMAIN-SUFFIX', value: 'nintendo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'nintendo.net' },
        // Battle.net / Blizzard
        { type: 'DOMAIN-SUFFIX', value: 'battle.net' },
        { type: 'DOMAIN-SUFFIX', value: 'blizzard.com' },
        // Riot Games
        { type: 'DOMAIN-SUFFIX', value: 'riotgames.com' },
        { type: 'DOMAIN-SUFFIX', value: 'leagueoflegends.com' },
        // Discord (gaming-adjacent)
        { type: 'DOMAIN-SUFFIX', value: 'discord.com' },
        { type: 'DOMAIN-SUFFIX', value: 'discord.gg' },
        { type: 'DOMAIN-SUFFIX', value: 'discordapp.com' },
        { type: 'DOMAIN-SUFFIX', value: 'discordapp.net' },
      ],
    },
    {
      name: 'Social Media',
      icon: 'forum',
      groupType: 'select',
      description: 'Social media platforms (Twitter/X, Instagram, Facebook, TikTok, etc.)',
      order: 3,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        // Twitter / X
        { type: 'DOMAIN-SUFFIX', value: 'twitter.com' },
        { type: 'DOMAIN-SUFFIX', value: 'x.com' },
        { type: 'DOMAIN-SUFFIX', value: 't.co' },
        { type: 'DOMAIN-SUFFIX', value: 'twimg.com' },
        // Instagram
        { type: 'DOMAIN-SUFFIX', value: 'instagram.com' },
        { type: 'DOMAIN-SUFFIX', value: 'cdninstagram.com' },
        // Facebook
        { type: 'DOMAIN-SUFFIX', value: 'facebook.com' },
        { type: 'DOMAIN-SUFFIX', value: 'fbcdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'fb.com' },
        { type: 'DOMAIN-SUFFIX', value: 'fb.me' },
        // TikTok
        { type: 'DOMAIN-SUFFIX', value: 'tiktok.com' },
        { type: 'DOMAIN-SUFFIX', value: 'tiktokcdn.com' },
        { type: 'DOMAIN-SUFFIX', value: 'tiktokv.com' },
        // Reddit
        { type: 'DOMAIN-SUFFIX', value: 'reddit.com' },
        { type: 'DOMAIN-SUFFIX', value: 'redd.it' },
        { type: 'DOMAIN-SUFFIX', value: 'redditstatic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'redditmedia.com' },
        // Telegram
        { type: 'DOMAIN-SUFFIX', value: 'telegram.org' },
        { type: 'DOMAIN-SUFFIX', value: 't.me' },
        { type: 'DOMAIN-SUFFIX', value: 'telegra.ph' },
        { type: 'IP-CIDR', value: '91.108.0.0/16' },
        { type: 'IP-CIDR', value: '149.154.160.0/20' },
        // WhatsApp
        { type: 'DOMAIN-SUFFIX', value: 'whatsapp.com' },
        { type: 'DOMAIN-SUFFIX', value: 'whatsapp.net' },
        // Line
        { type: 'DOMAIN-SUFFIX', value: 'line.me' },
        { type: 'DOMAIN-SUFFIX', value: 'line-scdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'naver.jp' },
      ],
    },
    {
      name: 'AI Services',
      icon: 'psychology',
      groupType: 'select',
      description: 'AI and machine learning platforms (OpenAI, Claude, Google AI, etc.)',
      order: 4,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        { type: 'DOMAIN-SUFFIX', value: 'openai.com' },
        { type: 'DOMAIN-SUFFIX', value: 'chat.openai.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ai.com' },
        { type: 'DOMAIN-SUFFIX', value: 'anthropic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'claude.ai' },
        { type: 'DOMAIN-SUFFIX', value: 'bard.google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'gemini.google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'perplexity.ai' },
        { type: 'DOMAIN-SUFFIX', value: 'midjourney.com' },
        { type: 'DOMAIN-SUFFIX', value: 'stability.ai' },
        { type: 'DOMAIN-SUFFIX', value: 'huggingface.co' },
        { type: 'DOMAIN-SUFFIX', value: 'cohere.ai' },
        { type: 'DOMAIN-SUFFIX', value: 'replicate.com' },
        { type: 'DOMAIN-SUFFIX', value: 'together.ai' },
      ],
    },
    {
      name: 'Blocked Sites',
      icon: 'block',
      groupType: 'select',
      description: 'Commonly blocked services (Google, Wikipedia, etc.)',
      order: 5,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        // Google
        { type: 'DOMAIN-SUFFIX', value: 'google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'google.co.jp' },
        { type: 'DOMAIN-SUFFIX', value: 'googleapis.com' },
        { type: 'DOMAIN-SUFFIX', value: 'googleusercontent.com' },
        { type: 'DOMAIN-SUFFIX', value: 'gstatic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ggpht.com' },
        { type: 'DOMAIN-SUFFIX', value: 'google.cn' },
        { type: 'DOMAIN-SUFFIX', value: 'googleadservices.com' },
        { type: 'DOMAIN-SUFFIX', value: 'googlesyndication.com' },
        { type: 'DOMAIN-SUFFIX', value: 'google-analytics.com' },
        { type: 'DOMAIN-SUFFIX', value: 'googletagmanager.com' },
        // Gmail
        { type: 'DOMAIN-SUFFIX', value: 'gmail.com' },
        // Google Drive
        { type: 'DOMAIN-SUFFIX', value: 'drive.google.com' },
        // Wikipedia
        { type: 'DOMAIN-SUFFIX', value: 'wikipedia.org' },
        { type: 'DOMAIN-SUFFIX', value: 'wikimedia.org' },
        { type: 'DOMAIN-SUFFIX', value: 'wikidata.org' },
        // GitHub
        { type: 'DOMAIN-SUFFIX', value: 'github.com' },
        { type: 'DOMAIN-SUFFIX', value: 'github.io' },
        { type: 'DOMAIN-SUFFIX', value: 'githubusercontent.com' },
        { type: 'DOMAIN-SUFFIX', value: 'githubassets.com' },
        // Medium
        { type: 'DOMAIN-SUFFIX', value: 'medium.com' },
        // Cloudflare
        { type: 'DOMAIN-SUFFIX', value: 'cloudflare.com' },
        // Amazon (international)
        { type: 'DOMAIN-SUFFIX', value: 'amazon.com' },
        { type: 'DOMAIN-SUFFIX', value: 'amazon.co.jp' },
        { type: 'DOMAIN-SUFFIX', value: 'amazonaws.com' },
        // Microsoft
        { type: 'DOMAIN-SUFFIX', value: 'microsoft.com' },
        { type: 'DOMAIN-SUFFIX', value: 'live.com' },
        { type: 'DOMAIN-SUFFIX', value: 'office.com' },
        { type: 'DOMAIN-SUFFIX', value: 'office365.com' },
        { type: 'DOMAIN-SUFFIX', value: 'microsoftonline.com' },
        { type: 'DOMAIN-SUFFIX', value: 'outlook.com' },
        // Apple
        { type: 'DOMAIN-SUFFIX', value: 'apple.com' },
        { type: 'DOMAIN-SUFFIX', value: 'icloud.com' },
        { type: 'DOMAIN-SUFFIX', value: 'mzstatic.com' },
      ],
    },
    {
      name: 'Developer',
      icon: 'code',
      groupType: 'select',
      description: 'Developer tools and package registries',
      order: 6,
      isBuiltIn: true,
      createdAt: new Date().toISOString(),
      rules: [
        { type: 'DOMAIN-SUFFIX', value: 'npmjs.org' },
        { type: 'DOMAIN-SUFFIX', value: 'npmjs.com' },
        { type: 'DOMAIN-SUFFIX', value: 'yarnpkg.com' },
        { type: 'DOMAIN-SUFFIX', value: 'docker.io' },
        { type: 'DOMAIN-SUFFIX', value: 'docker.com' },
        { type: 'DOMAIN-SUFFIX', value: 'pypi.org' },
        { type: 'DOMAIN-SUFFIX', value: 'pip.pypa.io' },
        { type: 'DOMAIN-SUFFIX', value: 'rubygems.org' },
        { type: 'DOMAIN-SUFFIX', value: 'crates.io' },
        { type: 'DOMAIN-SUFFIX', value: 'golang.org' },
        { type: 'DOMAIN-SUFFIX', value: 'go.dev' },
        { type: 'DOMAIN-SUFFIX', value: 'stackexchange.com' },
        { type: 'DOMAIN-SUFFIX', value: 'stackoverflow.com' },
        { type: 'DOMAIN-SUFFIX', value: 'gitlab.com' },
        { type: 'DOMAIN-SUFFIX', value: 'bitbucket.org' },
        { type: 'DOMAIN-SUFFIX', value: 'vercel.com' },
        { type: 'DOMAIN-SUFFIX', value: 'netlify.com' },
        { type: 'DOMAIN-SUFFIX', value: 'heroku.com' },
      ],
    },
  ];

  // Check if already seeded
  const existing = await db.collection('serviceCategories').limit(1).get();
  if (!existing.empty) {
    console.log('Service categories already exist. Skipping seed.');
    console.log('To re-seed, delete the serviceCategories collection first.');
    process.exit(0);
  }

  const batch = db.batch();
  for (const cat of categories) {
    const ref = db.collection('serviceCategories').doc();
    batch.set(ref, cat);
  }
  await batch.commit();

  console.log(`Seeded ${categories.length} service categories.`);

  // Create default tiers
  const tiersExisting = await db.collection('tiers').limit(1).get();
  if (tiersExisting.empty) {
    console.log('Seeding default tiers...');
    const tiers = [
      {
        name: 'Espresso',
        description: 'Premium tier with access to all proxy sources',
        allowedSourceIds: [],
        icon: 'bolt',
        color: 'primary',
        isDefault: false,
        createdAt: new Date().toISOString(),
      },
      {
        name: 'Latte',
        description: 'Standard tier with access to basic proxy sources',
        allowedSourceIds: [],
        icon: 'coffee',
        color: 'secondary',
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
      {
        name: 'Free Bean',
        description: 'Free tier with limited proxy access',
        allowedSourceIds: [],
        icon: 'eco',
        color: 'outline',
        isDefault: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const tierBatch = db.batch();
    for (const tier of tiers) {
      const ref = db.collection('tiers').doc();
      tierBatch.set(ref, tier);
    }
    await tierBatch.commit();
    console.log(`Seeded ${tiers.length} default tiers.`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
