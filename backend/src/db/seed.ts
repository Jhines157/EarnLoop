import pool from './index';

const seed = async () => {
  console.log('🌱 Seeding database...');

  try {
    // Seed store items - only items that ACTUALLY WORK
    await pool.query(`
      INSERT INTO store_items (name, description, credits_cost, item_type, category, duration_days, max_per_user, icon, sort_order, is_active)
      VALUES 
        -- 🎁 GIFT CARDS (manually fulfilled within 24-48 hours)
        ('$5 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 1, true),
        ('$10 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🛒', 2, true),
        ('$25 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 23000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 3, true),
        ('$5 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 4, true),
        ('$10 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🍎', 5, true),
        ('$25 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 23000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 6, true),
        ('$5 Google Play Gift Card', 'Digital Google Play gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🎮', 7, true),
        ('$10 Google Play Gift Card', 'Digital Google Play gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🎮', 8, true),
        ('$5 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '☕', 9, true),
        ('$10 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '☕', 10, true),
        
        -- ⚡ POWER-UPS (these actually work!)
        ('Streak Saver', 'Automatically protects your streak if you miss a day. Used automatically when needed!', 150, 'consumable', 'powerups', NULL, NULL, '🛡️', 20, true),
        ('Streak Freeze', 'Same as Streak Saver - protects your streak once when you miss a day', 150, 'consumable', 'powerups', NULL, NULL, '❄️', 21, true),
        ('2x Credits Boost (24h)', 'Double your credits from watching ads for 24 hours! Activates immediately.', 200, 'boost', 'powerups', 1, NULL, '⚡', 22, true),
        ('2x Credits Boost (7 days)', 'Double your credits from watching ads for a full week! Best value.', 800, 'boost', 'powerups', 7, NULL, '🚀', 23, true)
      ON CONFLICT (name) DO UPDATE SET 
        description = EXCLUDED.description,
        credits_cost = EXCLUDED.credits_cost,
        item_type = EXCLUDED.item_type,
        category = EXCLUDED.category,
        duration_days = EXCLUDED.duration_days,
        max_per_user = EXCLUDED.max_per_user,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;
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
