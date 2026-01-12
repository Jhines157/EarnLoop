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
        -- 🎨 COSMETICS (permanent unlocks)
        ('Dark Mode Pro', 'Unlock the sleek dark theme with OLED blacks', 100, 'cosmetic', 'cosmetics', NULL, 1, '🌙', 1),
        ('Neon Theme Pack', 'Vibrant neon colors that pop', 250, 'cosmetic', 'cosmetics', NULL, 1, '💜', 2),
        ('Gold Theme', 'Luxurious gold accents everywhere', 300, 'cosmetic', 'cosmetics', NULL, 1, '✨', 3),
        ('Custom App Icon - Bitcoin', 'Orange Bitcoin icon for your home screen', 150, 'cosmetic', 'cosmetics', NULL, 1, '🟠', 4),
        ('Custom App Icon - Diamond', 'Diamond icon to show your status', 200, 'cosmetic', 'cosmetics', NULL, 1, '💎', 5),
        
        -- 🎮 GAMIFICATION (consumables and boosts)
        ('Streak Saver', 'Protects your streak if you miss a day (single use)', 150, 'consumable', 'gamification', NULL, NULL, '🛡️', 10),
        ('2x XP Boost (24h)', 'Double your XP earnings for 24 hours', 100, 'boost', 'gamification', 1, NULL, '⚡', 11),
        ('2x XP Boost (7 days)', 'Double your XP earnings for a full week', 500, 'boost', 'gamification', 7, NULL, '🚀', 12),
        ('Streak Freeze', 'Automatically save your streak once (lasts until used)', 300, 'consumable', 'gamification', NULL, NULL, '❄️', 13),
        
        -- 🎁 GIVEAWAY PERKS
        ('Bonus Giveaway Entry', 'Get +1 extra entry to the current giveaway', 200, 'giveaway', 'giveaways', NULL, 5, '🎟️', 20),
        ('Early Access Pass', 'Get notified about giveaways 24h before everyone else', 400, 'feature', 'giveaways', 30, NULL, '🔔', 21),
        
        -- 📚 PREMIUM CONTENT
        ('Advanced Bitcoin Lessons', 'Unlock 10 advanced lessons on Bitcoin & crypto', 500, 'content', 'premium', NULL, 1, '📖', 30),
        ('Trading Strategies Guide', 'Expert guide on reading charts and patterns', 600, 'content', 'premium', NULL, 1, '📈', 31),
        ('DeFi Masterclass', 'Learn about decentralized finance', 700, 'content', 'premium', NULL, 1, '🏦', 32),
        
        -- 👑 VIP / STATUS
        ('VIP Badge', 'Show off your VIP status on your profile', 1000, 'badge', 'vip', NULL, 1, '👑', 40),
        ('Founder Badge', 'Limited edition badge for early supporters', 2000, 'badge', 'vip', NULL, 1, '🏆', 41),
        ('Pro Member (30 days)', 'All premium features for 30 days', 1500, 'subscription', 'vip', 30, NULL, '⭐', 42)
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
