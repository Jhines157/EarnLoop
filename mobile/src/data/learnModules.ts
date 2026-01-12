/**
 * Learn Modules Data
 * 
 * These are sample educational modules users can complete to earn credits.
 * Each module has content to read and a quiz with questions.
 * Users must score 70% or higher to earn credits.
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LearnModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  creditsReward: number;
  content: string;
  quiz: QuizQuestion[];
}

export const LEARN_MODULES: LearnModule[] = [
  {
    id: 'credits-101',
    title: 'Understanding Credits',
    description: 'Learn how credits work in EarnLoop',
    estimatedMinutes: 2,
    creditsReward: 15,
    content: `
# How Credits Work in EarnLoop

## What Are Credits?
Credits are the in-app currency you earn by engaging with EarnLoop. They're designed to reward your daily activity and loyalty.

## How to Earn Credits
1. **Daily Check-In**: Tap the check-in button once per day to earn 5 credits
2. **Watch Ads**: View rewarded video ads to earn 10 credits each
3. **Learn Modules**: Complete educational content and quizzes to earn 15 credits
4. **Maintain Streaks**: Keep your daily streak going for bonus rewards

## Important Notes
- Credits have **no cash value** and cannot be exchanged for money
- Credits can only be used inside the EarnLoop app
- Daily earning limits help us keep the platform sustainable
- New users have lower limits that increase over time

## What Can You Do with Credits?
Redeem credits in our Rewards Store for:
- Premium features
- Ad-free experiences
- Exclusive themes
- And more!
    `.trim(),
    quiz: [
      {
        id: 'c101-q1',
        question: 'How many credits do you earn from a daily check-in?',
        options: ['3 credits', '5 credits', '10 credits', '15 credits'],
        correctIndex: 1,
      },
      {
        id: 'c101-q2',
        question: 'Can credits be exchanged for cash?',
        options: ['Yes, anytime', 'Only after 30 days', 'No, never', 'Yes, with a fee'],
        correctIndex: 2,
      },
      {
        id: 'c101-q3',
        question: 'What is the minimum quiz score needed to earn credits?',
        options: ['50%', '60%', '70%', '80%'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'savings-basics',
    title: 'Savings Basics',
    description: 'Learn fundamental saving strategies',
    estimatedMinutes: 3,
    creditsReward: 15,
    content: `
# Savings Basics: Building Financial Security

## Why Save Money?
Saving money provides a safety net for unexpected expenses and helps you reach your financial goals.

## The 50/30/20 Rule
A popular budgeting method:
- **50%** for needs (rent, food, utilities)
- **30%** for wants (entertainment, dining out)
- **20%** for savings and debt repayment

## Emergency Fund
Financial experts recommend saving 3-6 months of expenses in an easily accessible account for emergencies.

## Tips for Saving
1. **Automate**: Set up automatic transfers to savings
2. **Start Small**: Even $5/week adds up over time
3. **Track Spending**: Know where your money goes
4. **Cut Subscriptions**: Review and cancel unused services
5. **Wait 24 Hours**: Delay impulse purchases

## The Power of Compound Interest
When you save in an interest-bearing account, you earn interest on your interest. Starting early makes a huge difference!
    `.trim(),
    quiz: [
      {
        id: 'sb-q1',
        question: 'In the 50/30/20 rule, what percentage goes to savings?',
        options: ['10%', '20%', '30%', '50%'],
        correctIndex: 1,
      },
      {
        id: 'sb-q2',
        question: 'How many months of expenses should an emergency fund cover?',
        options: ['1-2 months', '3-6 months', '12 months', '24 months'],
        correctIndex: 1,
      },
      {
        id: 'sb-q3',
        question: 'What is compound interest?',
        options: [
          'Interest paid monthly',
          'Interest earned on your interest',
          'A type of loan',
          'A savings account fee',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'digital-security',
    title: 'Digital Security',
    description: 'Protect yourself online',
    estimatedMinutes: 3,
    creditsReward: 15,
    content: `
# Digital Security: Staying Safe Online

## Password Best Practices
1. Use **unique passwords** for each account
2. Make passwords at least **12 characters** long
3. Include uppercase, lowercase, numbers, and symbols
4. Consider using a **password manager**

## Two-Factor Authentication (2FA)
Always enable 2FA when available. It adds an extra layer of security beyond your password.

Types of 2FA:
- SMS codes (better than nothing)
- Authenticator apps (recommended)
- Hardware keys (most secure)

## Recognizing Phishing
Watch for these red flags:
- Urgent language ("Act now or lose access!")
- Suspicious sender addresses
- Links that don't match the claimed website
- Requests for personal information

## Safe Browsing Tips
- Look for HTTPS in the URL
- Don't download from untrusted sources
- Keep your software updated
- Use a reputable antivirus program

## Protecting Your Privacy
- Review app permissions regularly
- Limit social media sharing
- Use privacy-focused browsers when possible
    `.trim(),
    quiz: [
      {
        id: 'ds-q1',
        question: 'What is the minimum recommended password length?',
        options: ['6 characters', '8 characters', '12 characters', '20 characters'],
        correctIndex: 2,
      },
      {
        id: 'ds-q2',
        question: 'Which 2FA method is generally most secure?',
        options: ['SMS codes', 'Email codes', 'Authenticator apps', 'Security questions'],
        correctIndex: 2,
      },
      {
        id: 'ds-q3',
        question: 'What does HTTPS in a URL indicate?',
        options: [
          'The site is popular',
          'The connection is encrypted',
          'The site is free',
          'The site has ads',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'budgeting-apps',
    title: 'Smart Budgeting',
    description: 'Tools and techniques for managing money',
    estimatedMinutes: 3,
    creditsReward: 15,
    content: `
# Smart Budgeting: Taking Control of Your Finances

## Why Budget?
A budget helps you:
- Know exactly where your money goes
- Identify areas to cut spending
- Reach your savings goals faster
- Reduce financial stress

## Zero-Based Budgeting
Every dollar has a job. Income minus expenses equals zero.
This means you assign every dollar to a category before you spend it.

## Envelope Method
- Allocate cash to envelopes for each spending category
- When the envelope is empty, you're done spending in that category
- Great for controlling discretionary spending

## Digital Budgeting
Modern apps can:
- Sync with your bank accounts
- Categorize spending automatically
- Send alerts when you overspend
- Show spending trends over time

## Common Budgeting Mistakes
1. Being too restrictive (you'll burn out)
2. Not accounting for irregular expenses
3. Forgetting to adjust as income changes
4. Not tracking small purchases

## Review and Adjust
Check your budget weekly at first, then monthly once you're comfortable. Adjust categories as needed.
    `.trim(),
    quiz: [
      {
        id: 'ba-q1',
        question: 'In zero-based budgeting, income minus expenses equals:',
        options: ['Savings', 'Zero', 'Profit', 'Debt'],
        correctIndex: 1,
      },
      {
        id: 'ba-q2',
        question: 'What is the envelope method best for?',
        options: [
          'Investing',
          'Controlling discretionary spending',
          'Paying bills',
          'Earning interest',
        ],
        correctIndex: 1,
      },
      {
        id: 'ba-q3',
        question: 'How often should you review your budget when starting out?',
        options: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
        correctIndex: 1,
      },
    ],
  },
];

// Helper to calculate quiz score
export const calculateQuizScore = (
  answers: Record<string, number>,
  quiz: QuizQuestion[]
): number => {
  let correct = 0;
  quiz.forEach((question) => {
    if (answers[question.id] === question.correctIndex) {
      correct++;
    }
  });
  return Math.round((correct / quiz.length) * 100);
};

// Get module by ID
export const getModuleById = (id: string): LearnModule | undefined => {
  return LEARN_MODULES.find((m) => m.id === id);
};

export default LEARN_MODULES;
