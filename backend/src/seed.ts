import { db } from './config/database';
import { v4 as uuidv4 } from 'uuid';
import { ServiceCategory } from './types';

/**
 * Seeds the database with default service categories and tiers.
 * Run with: npm run seed
 */
function seed() {
  console.log('Seeding default service categories...');

  const categories: Omit<ServiceCategory, 'id'>[] = [
    {
      name: 'Streaming',
      icon: 'movie',
      description: 'Video streaming services (Netflix, YouTube, Disney+, etc.)',
      order: 1,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
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
      description: 'Gaming platforms and services (Steam, Epic, PlayStation, Xbox, etc.)',
      order: 2,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
        { type: 'DOMAIN-SUFFIX', value: 'steampowered.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamcommunity.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamstatic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamcontent.com' },
        { type: 'DOMAIN-SUFFIX', value: 'steamusercontent.com' },
        { type: 'DOMAIN-KEYWORD', value: 'steam' },
        { type: 'DOMAIN-SUFFIX', value: 'epicgames.com' },
        { type: 'DOMAIN-SUFFIX', value: 'unrealengine.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ol.epicgames.com' },
        { type: 'DOMAIN-SUFFIX', value: 'ea.com' },
        { type: 'DOMAIN-SUFFIX', value: 'origin.com' },
        { type: 'DOMAIN-SUFFIX', value: 'playstation.com' },
        { type: 'DOMAIN-SUFFIX', value: 'playstation.net' },
        { type: 'DOMAIN-SUFFIX', value: 'sony.com' },
        { type: 'DOMAIN-SUFFIX', value: 'sonyentertainmentnetwork.com' },
        { type: 'DOMAIN-SUFFIX', value: 'xbox.com' },
        { type: 'DOMAIN-SUFFIX', value: 'xboxlive.com' },
        { type: 'DOMAIN-SUFFIX', value: 'xboxservices.com' },
        { type: 'DOMAIN-SUFFIX', value: 'nintendo.com' },
        { type: 'DOMAIN-SUFFIX', value: 'nintendo.net' },
        { type: 'DOMAIN-SUFFIX', value: 'battle.net' },
        { type: 'DOMAIN-SUFFIX', value: 'blizzard.com' },
        { type: 'DOMAIN-SUFFIX', value: 'riotgames.com' },
        { type: 'DOMAIN-SUFFIX', value: 'leagueoflegends.com' },
        { type: 'DOMAIN-SUFFIX', value: 'discord.com' },
        { type: 'DOMAIN-SUFFIX', value: 'discord.gg' },
        { type: 'DOMAIN-SUFFIX', value: 'discordapp.com' },
        { type: 'DOMAIN-SUFFIX', value: 'discordapp.net' },
      ],
    },
    {
      name: 'Social Media',
      icon: 'forum',
      description: 'Social media platforms (Twitter/X, Instagram, Facebook, TikTok, etc.)',
      order: 3,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
        { type: 'DOMAIN-SUFFIX', value: 'twitter.com' },
        { type: 'DOMAIN-SUFFIX', value: 'x.com' },
        { type: 'DOMAIN-SUFFIX', value: 't.co' },
        { type: 'DOMAIN-SUFFIX', value: 'twimg.com' },
        { type: 'DOMAIN-SUFFIX', value: 'instagram.com' },
        { type: 'DOMAIN-SUFFIX', value: 'cdninstagram.com' },
        { type: 'DOMAIN-SUFFIX', value: 'facebook.com' },
        { type: 'DOMAIN-SUFFIX', value: 'fbcdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'fb.com' },
        { type: 'DOMAIN-SUFFIX', value: 'fb.me' },
        { type: 'DOMAIN-SUFFIX', value: 'tiktok.com' },
        { type: 'DOMAIN-SUFFIX', value: 'tiktokcdn.com' },
        { type: 'DOMAIN-SUFFIX', value: 'tiktokv.com' },
        { type: 'DOMAIN-SUFFIX', value: 'reddit.com' },
        { type: 'DOMAIN-SUFFIX', value: 'redd.it' },
        { type: 'DOMAIN-SUFFIX', value: 'redditstatic.com' },
        { type: 'DOMAIN-SUFFIX', value: 'redditmedia.com' },
        { type: 'DOMAIN-SUFFIX', value: 'telegram.org' },
        { type: 'DOMAIN-SUFFIX', value: 't.me' },
        { type: 'DOMAIN-SUFFIX', value: 'telegra.ph' },
        { type: 'IP-CIDR', value: '91.108.0.0/16' },
        { type: 'IP-CIDR', value: '149.154.160.0/20' },
        { type: 'DOMAIN-SUFFIX', value: 'whatsapp.com' },
        { type: 'DOMAIN-SUFFIX', value: 'whatsapp.net' },
        { type: 'DOMAIN-SUFFIX', value: 'line.me' },
        { type: 'DOMAIN-SUFFIX', value: 'line-scdn.net' },
        { type: 'DOMAIN-SUFFIX', value: 'naver.jp' },
      ],
    },
    {
      name: 'AI Services',
      icon: 'psychology',
      description: 'AI and machine learning platforms (OpenAI, Claude, Google AI, etc.)',
      order: 4,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
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
      description: 'Commonly blocked services (Google, Wikipedia, etc.)',
      order: 5,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
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
        { type: 'DOMAIN-SUFFIX', value: 'gmail.com' },
        { type: 'DOMAIN-SUFFIX', value: 'drive.google.com' },
        { type: 'DOMAIN-SUFFIX', value: 'wikipedia.org' },
        { type: 'DOMAIN-SUFFIX', value: 'wikimedia.org' },
        { type: 'DOMAIN-SUFFIX', value: 'wikidata.org' },
        { type: 'DOMAIN-SUFFIX', value: 'github.com' },
        { type: 'DOMAIN-SUFFIX', value: 'github.io' },
        { type: 'DOMAIN-SUFFIX', value: 'githubusercontent.com' },
        { type: 'DOMAIN-SUFFIX', value: 'githubassets.com' },
        { type: 'DOMAIN-SUFFIX', value: 'medium.com' },
        { type: 'DOMAIN-SUFFIX', value: 'cloudflare.com' },
        { type: 'DOMAIN-SUFFIX', value: 'amazon.com' },
        { type: 'DOMAIN-SUFFIX', value: 'amazon.co.jp' },
        { type: 'DOMAIN-SUFFIX', value: 'amazonaws.com' },
        { type: 'DOMAIN-SUFFIX', value: 'microsoft.com' },
        { type: 'DOMAIN-SUFFIX', value: 'live.com' },
        { type: 'DOMAIN-SUFFIX', value: 'office.com' },
        { type: 'DOMAIN-SUFFIX', value: 'office365.com' },
        { type: 'DOMAIN-SUFFIX', value: 'microsoftonline.com' },
        { type: 'DOMAIN-SUFFIX', value: 'outlook.com' },
        { type: 'DOMAIN-SUFFIX', value: 'apple.com' },
        { type: 'DOMAIN-SUFFIX', value: 'icloud.com' },
        { type: 'DOMAIN-SUFFIX', value: 'mzstatic.com' },
      ],
    },
    {
      name: 'Developer',
      icon: 'code',
      description: 'Developer tools and package registries',
      order: 6,
      createdAt: new Date().toISOString(),
      ruleProviders: [],
      extraRules: [
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
  const existing = db.prepare('SELECT id FROM service_categories LIMIT 1').get();
  if (existing) {
    console.log('Service categories already exist. Skipping seed.');
    console.log('To re-seed, delete the service_categories table rows first.');
    process.exit(0);
  }

  const insertCategory = db.prepare(
    'INSERT INTO service_categories (id, name, icon, description, rule_providers, extra_rules, order_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );

  db.exec('BEGIN');
  for (const cat of categories) {
    insertCategory.run(
      uuidv4(), cat.name, cat.icon, cat.description,
      JSON.stringify(cat.ruleProviders),
      JSON.stringify(cat.extraRules),
      cat.order,
      cat.createdAt,
    );
  }
  db.exec('COMMIT');
  console.log(`Seeded ${categories.length} service categories.`);

  // Create default tiers
  const tiersExisting = db.prepare('SELECT id FROM tiers LIMIT 1').get();
  if (!tiersExisting) {
    console.log('Seeding default tiers...');

    const tiers = [
      { name: 'Espresso', description: 'Premium tier with access to all proxy sources', allowedSourceIds: [], icon: 'bolt', color: 'primary', isDefault: false },
      { name: 'Latte', description: 'Standard tier with access to basic proxy sources', allowedSourceIds: [], icon: 'coffee', color: 'secondary', isDefault: true },
      { name: 'Free Bean', description: 'Free tier with limited proxy access', allowedSourceIds: [], icon: 'eco', color: 'outline', isDefault: false },
    ];

    const insertTier = db.prepare(
      'INSERT INTO tiers (id, name, description, allowed_source_ids, icon, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );

    db.exec('BEGIN');
    for (const tier of tiers) {
      insertTier.run(
        uuidv4(), tier.name, tier.description,
        JSON.stringify(tier.allowedSourceIds),
        tier.icon, tier.color,
        tier.isDefault ? 1 : 0,
        new Date().toISOString(),
      );
    }
    db.exec('COMMIT');
    console.log(`Seeded ${tiers.length} default tiers.`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed();
