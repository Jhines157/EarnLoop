import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography } from '../utils/theme';
import { LEARN_MODULES, LearnModule, QuizQuestion, calculateQuizScore } from '../data/learnModules';

interface LearnScreenProps {
  onComplete?: () => void;
}

const LearnScreen: React.FC<LearnScreenProps> = ({ onComplete }) => {
  const { updateBalance } = useAuth();
  const { colors } = useTheme();
  const [selectedModule, setSelectedModule] = useState<LearnModule | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const handleModuleSelect = (module: LearnModule) => {
    setSelectedModule(module);
    setShowQuiz(false);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNextQuestion = () => {
    if (selectedModule && currentQuestion < selectedModule.quiz.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedModule) return;

    const score = calculateQuizScore(answers, selectedModule.quiz);
    
    if (score < 70) {
      Alert.alert(
        'Quiz Not Passed',
        `You scored ${score}%. You need at least 70% to earn credits. Try again!`,
        [
          { text: 'Review Content', onPress: () => setShowQuiz(false) },
          { text: 'Retry Quiz', onPress: () => {
            setCurrentQuestion(0);
            setAnswers({});
          }},
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.completeLearnModule(selectedModule.id, score);
      
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        const tokensMsg = response.data.tokensEarned ? `\n+${response.data.tokensEarned} Fun Tokens! 🎰` : '';
        Alert.alert(
          'Congratulations! 🎉',
          `You scored ${score}% and earned ${response.data.creditsEarned} credits!${tokensMsg}`,
          [{ text: 'Continue', onPress: () => {
            setSelectedModule(null);
            onComplete?.();
          }}]
        );
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to submit quiz');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModule = () => {
    setSelectedModule(null);
    setShowQuiz(false);
  };

  const styles = createStyles(colors);

  // Module list view
  if (!selectedModule) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Learn & Earn</Text>
          <Text style={styles.subtitle}>
            Complete modules and quizzes to earn credits
          </Text>

          {LEARN_MODULES.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => handleModuleSelect(module)}
            >
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardText}>+{module.creditsReward}</Text>
                </View>
              </View>
              <Text style={styles.moduleDescription}>{module.description}</Text>
              <Text style={styles.moduleMeta}>
                ⏱️ {module.estimatedMinutes} min • 📝 {module.quiz.length} questions
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Quiz view
  if (showQuiz && selectedModule) {
    const question = selectedModule.quiz[currentQuestion];
    const selectedAnswer = answers[question.id];
    const allAnswered = selectedModule.quiz.every(q => answers[q.id] !== undefined);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.quizContainer}>
          {/* Header */}
          <View style={styles.quizHeader}>
            <TouchableOpacity onPress={handleCloseModule}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.quizProgress}>
              Question {currentQuestion + 1} of {selectedModule.quiz.length}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestion + 1) / selectedModule.quiz.length) * 100}%` }
              ]} 
            />
          </View>

          {/* Question */}
          <ScrollView style={styles.questionContainer}>
            <Text style={styles.questionText}>{question.question}</Text>

            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === index && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswer(question.id, index)}
              >
                <Text style={[
                  styles.optionText,
                  selectedAnswer === index && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Navigation */}
          <View style={styles.quizNav}>
            <TouchableOpacity
              style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
              onPress={handlePrevQuestion}
              disabled={currentQuestion === 0}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>

            {currentQuestion < selectedModule.quiz.length - 1 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={handleNextQuestion}
              >
                <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                  Next →
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navButton, 
                  styles.navButtonPrimary,
                  (!allAnswered || loading) && styles.navButtonDisabled,
                ]}
                onPress={handleSubmitQuiz}
                disabled={!allAnswered || loading}
              >
                <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Module content view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.moduleView}>
        {/* Header */}
        <View style={styles.moduleViewHeader}>
          <TouchableOpacity onPress={handleCloseModule}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.moduleViewTitle} numberOfLines={1}>
            {selectedModule.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.contentScroll}>
          <Text style={styles.contentText}>{selectedModule.content}</Text>
        </ScrollView>

        {/* Start Quiz Button */}
        <TouchableOpacity style={styles.startQuizButton} onPress={handleStartQuiz}>
          <Text style={styles.startQuizButtonText}>
            Start Quiz ({selectedModule.quiz.length} questions)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  moduleCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  moduleTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  rewardBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rewardText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  moduleDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  moduleMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // Module view
  moduleView: {
    flex: 1,
  },
  moduleViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleViewTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  closeButton: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  contentScroll: {
    flex: 1,
    padding: spacing.md,
  },
  contentText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  startQuizButton: {
    backgroundColor: colors.primary,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  startQuizButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Quiz view
  quizContainer: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  quizProgress: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.md,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    padding: spacing.md,
  },
  questionText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  optionButton: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  quizNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
  },
  navButtonPrimary: {
    backgroundColor: colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  navButtonTextPrimary: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default LearnScreen;
