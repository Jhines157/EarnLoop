import pool from './index';

const seed = async () => {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing store items for fresh seed
    await pool.query('DELETE FROM store_items WHERE TRUE');

    // Seed store items with categories
    await pool.query(`
      INSERT INTO store_items (name, description, credits_cost, item_type, category, duration_days, max_per_user, icon, sort_order)
      VALUES 
        -- � GIFT CARDS (real rewards!)
        ('$5 Amazon Gift Card', 'Digital Amazon gift card code sent to your email', 5000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 1),
        ('$10 Amazon Gift Card', 'Digital Amazon gift card code sent to your email', 9500, 'giftcard', 'giftcards', NULL, NULL, '🛒', 2),
        ('$25 Amazon Gift Card', 'Digital Amazon gift card code sent to your email', 23000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 3),
        ('$5 Apple Gift Card', 'Digital Apple gift card code sent to your email', 5000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 4),
        ('$10 Apple Gift Card', 'Digital Apple gift card code sent to your email', 9500, 'giftcard', 'giftcards', NULL, NULL, '🍎', 5),
        ('$25 Apple Gift Card', 'Digital Apple gift card code sent to your email', 23000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 6),
        ('$5 Google Play Gift Card', 'Digital Google Play gift card code sent to your email', 5000, 'giftcard', 'giftcards', NULL, NULL, '🎮', 7),
        ('$10 Google Play Gift Card', 'Digital Google Play gift card code sent to your email', 9500, 'giftcard', 'giftcards', NULL, NULL, '🎮', 8),
        ('$5 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email', 5000, 'giftcard', 'giftcards', NULL, NULL, '☕', 9),
        ('$10 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email', 9500, 'giftcard', 'giftcards', NULL, NULL, '☕', 10),
        
        -- 🎨 COSMETICS (permanent unlocks)
        ('Dark Mode Pro', 'Unlock the sleek dark theme with OLED blacks', 100, 'cosmetic', 'cosmetics', NULL, 1, '🌙', 20),
        ('Neon Theme Pack', 'Vibrant neon colors that pop', 250, 'cosmetic', 'cosmetics', NULL, 1, '💜', 21),
        ('Gold Theme', 'Luxurious gold accents everywhere', 300, 'cosmetic', 'cosmetics', NULL, 1, '✨', 22),
        ('Custom App Icon - Bitcoin', 'Orange Bitcoin icon for your home screen', 150, 'cosmetic', 'cosmetics', NULL, 1, '🟠', 23),
        ('Custom App Icon - Diamond', 'Diamond icon to show your status', 200, 'cosmetic', 'cosmetics', NULL, 1, '💎', 24),
        
        -- 🎮 GAMIFICATION (consumables and boosts)
        ('Streak Saver', 'Protects your streak if you miss a day (single use)', 150, 'consumable', 'gamification', NULL, NULL, '🛡️', 30),
        ('2x XP Boost (24h)', 'Double your XP earnings for 24 hours', 100, 'boost', 'gamification', 1, NULL, '⚡', 31),
        ('2x XP Boost (7 days)', 'Double your XP earnings for a full week', 500, 'boost', 'gamification', 7, NULL, '🚀', 32),
        ('Streak Freeze', 'Automatically save your streak once (lasts until used)', 300, 'consumable', 'gamification', NULL, NULL, '❄️', 33),
        
        -- 🎟️ GIVEAWAY PERKS
        ('Bonus Giveaway Entry', 'Get +1 extra entry to the current giveaway', 200, 'giveaway', 'giveaways', NULL, 5, '🎟️', 40),
        ('Early Access Pass', 'Get notified about giveaways 24h before everyone else', 400, 'feature', 'giveaways', 30, NULL, '🔔', 41),
        
        -- 📚 PREMIUM CONTENT
        ('Advanced Bitcoin Lessons', 'Unlock 10 advanced lessons on Bitcoin & crypto', 500, 'content', 'premium', NULL, 1, '📖', 50),
        ('Trading Strategies Guide', 'Expert guide on reading charts and patterns', 600, 'content', 'premium', NULL, 1, '📈', 51),
        ('DeFi Masterclass', 'Learn about decentralized finance', 700, 'content', 'premium', NULL, 1, '🏦', 52),
        
        -- 👑 VIP / STATUS
        ('VIP Badge', 'Show off your VIP status on your profile', 1000, 'badge', 'vip', NULL, 1, '👑', 60),
        ('Founder Badge', 'Limited edition badge for early supporters', 2000, 'badge', 'vip', NULL, 1, '🏆', 61),
        ('Pro Member (30 days)', 'All premium features for 30 days', 1500, 'subscription', 'vip', 30, NULL, '⭐', 62)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Store items seeded');
    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
