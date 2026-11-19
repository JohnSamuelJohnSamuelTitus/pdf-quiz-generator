import { run, query } from '../db/index.js';
import { ExtractedQuestion, QuizQuestion, QuestionType, DifficultyLevel } from '../../../shared/types.js';

export class QuestionExtractorService {
  /**
   * Discovers and extracts existing academic questions, exercises, and answer keys from document text
   */
  static extractQuestionsFromText(
    documentId: string,
    projectId: string,
    fullText: string,
    documentName: string
  ): ExtractedQuestion[] {
    const questions: ExtractedQuestion[] = [];
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

    // Regular expressions detecting questions
    const questionStartRegex = /^(?:Q(?:uestion)?\.?\s*([0-9]+)|([0-9]+)\.)\s+([A-Z].*\??)$/i;
    const mcqOptionRegex = /^[\(\[]?([A-Da-d])[\]\)\.]\s+(.+)$/;
    const answerKeyRegex = /^(?:Ans(?:wer)?|Key)\s*[:\-–]\s*[\(\[]?([A-Da-d]|True|False|.+?)[\)\]]?$/i;

    let currentQ: {
      questionNumber: number;
      text: string;
      options: string[];
      answerText?: string;
      isVerified: boolean;
      type: QuestionType;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line starts a question
      const qMatch = line.match(questionStartRegex);
      if (qMatch) {
        if (currentQ && currentQ.text.length > 10) {
          questions.push(this.formatExtractedQuestion(documentId, projectId, currentQ, documentName));
        }

        const qNum = parseInt(qMatch[1] || qMatch[2], 10) || (questions.length + 1);
        currentQ = {
          questionNumber: qNum,
          text: qMatch[3].trim(),
          options: [],
          isVerified: false,
          type: 'short_answer'
        };
        continue;
      }

      if (currentQ) {
        // Check for MCQ options (A, B, C, D)
        const optMatch = line.match(mcqOptionRegex);
        if (optMatch) {
          currentQ.type = 'multiple_choice';
          currentQ.options.push(`${optMatch[1].toUpperCase()}) ${optMatch[2].trim()}`);
          continue;
        }

        // Check for Answer Key
        const ansMatch = line.match(answerKeyRegex);
        if (ansMatch) {
          currentQ.answerText = ansMatch[1].trim();
          currentQ.isVerified = true;
          continue;
        }

        // Append line to question text if options haven't started yet
        if (currentQ.options.length === 0 && line.length > 0 && !line.startsWith('---')) {
          currentQ.text += ' ' + line;
        }
      }
    }

    if (currentQ && currentQ.text.length > 10) {
      questions.push(this.formatExtractedQuestion(documentId, projectId, currentQ, documentName));
    }

    return questions;
  }

  /**
   * Generates grounded assessment questions from document content chunks with deterministic fallback
   */
  static generateGroundedFromText(
    topicTitle: string,
    contentChunks: string[],
    amount: number = 3,
    difficulty: DifficultyLevel = 'moderate'
  ): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const joinedText = contentChunks.join('\n\n');

    // Extract sentences containing definitions, models, or constraints
    const sentences = joinedText
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 200);

    for (let i = 0; i < sentences.length && questions.length < amount; i++) {
      const sentence = sentences[i];
      const lower = sentence.toLowerCase();

      // Check for definitional sentence: "X is defined as Y" or "X represents Y"
      if (lower.includes(' is ') || lower.includes(' represents ') || lower.includes(' ensures ') || lower.includes(' requires ')) {
        const parts = sentence.split(/\b(?:is|represents|ensures|requires)\b/i);
        if (parts.length >= 2 && parts[0].trim().length > 3 && parts[1].trim().length > 10) {
          const subjectPart = parts[0].trim();
          const predicatePart = parts[1].trim().replace(/[.?!]$/, '');

          // Generate Multiple Choice question
          const options = [
            predicatePart,
            `Functions independently without any causal relationship to ${subjectPart}`,
            `Contradicts the core methodology established for ${topicTitle}`,
            `Applies only under extreme hypothetical conditions and has no standard relevance`
          ].sort(() => 0.5 - Math.random());

          questions.push({
            id: `grounded-mcq-${Date.now()}-${i}`,
            topicId: topicTitle.toLowerCase().replace(/\s+/g, '-'),
            questionType: 'multiple_choice',
            questionText: `According to the verified study material for "${topicTitle}", which of the following correctly describes ${subjectPart}?`,
            options,
            correctAnswer: predicatePart,
            explanation: `Source text excerpt: "${sentence}" directly confirms this relationship.`,
            difficulty,
            category: topicTitle,
            source: 'original_engine'
          });
        }
      }

      // Generate True/False question (alternating True and False for pedagogical balance)
      if (questions.length < amount && sentence.length > 40) {
        const isTrueQ = questions.length % 2 === 0;
        if (isTrueQ) {
          questions.push({
            id: `grounded-tf-${Date.now()}-${i}`,
            topicId: topicTitle.toLowerCase().replace(/\s+/g, '-'),
            questionType: 'true_false',
            questionText: `True or False: In the verified study material for "${topicTitle}", it is stated that: "${sentence}"`,
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: `True. Verified text excerpt directly confirmed in course material: "${sentence}".`,
            difficulty: 'foundational',
            category: topicTitle,
            source: 'original_engine'
          });
        } else {
          questions.push({
            id: `grounded-tf-${Date.now()}-${i}`,
            topicId: topicTitle.toLowerCase().replace(/\s+/g, '-'),
            questionType: 'true_false',
            questionText: `True or False: In "${topicTitle}", the core principles contradict the following concept: "${sentence}"`,
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: `False. The course material explicitly affirms this concept as an integral principle of "${topicTitle}".`,
            difficulty: 'moderate',
            category: topicTitle,
            source: 'original_engine'
          });
        }
      }
    }

    return questions;
  }

  static generateGroundedQuestions(
    topicTitle: string,
    contentChunks: string[],
    amount: number = 5,
    difficulty: DifficultyLevel = 'moderate',
    subtopics: string[] = []
  ): QuizQuestion[] {
    const fromDoc = QuestionExtractorService.generateGroundedFromText(topicTitle, contentChunks, amount, difficulty);
    if (fromDoc.length >= amount) {
      return fromDoc.slice(0, amount);
    }

    const needed = amount - fromDoc.length;
    const fallbackQuestions = QuestionExtractorService.generateCurriculumQuestions(
      topicTitle,
      subtopics,
      needed,
      difficulty
    );

    return [...fromDoc, ...fallbackQuestions];
  }

  /**
   * Generates curriculum-grounded assessment questions for any syllabus topic and subtopics
   * covering Conceptual, Application-based, True/False (both True and False), and Analytical aspects
   */
  static generateCurriculumQuestions(
    topicTitle: string,
    subtopics: string[] = [],
    amount: number = 5,
    difficulty: DifficultyLevel = 'moderate'
  ): QuizQuestion[] {
    const list: QuizQuestion[] = [];
    const tSlug = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const firstSub = subtopics.length > 0 ? subtopics[0] : `${topicTitle} core mechanism`;
    const secondSub = subtopics.length > 1 ? subtopics[1] : `principles of ${topicTitle}`;

    // 1. Conceptual Multiple Choice
    const q1Options = [
      `To systematically understand the foundational principles, mechanisms, and behavior of ${topicTitle}`,
      `To observe arbitrary outcomes without establishing empirical or theoretical rules`,
      `To substitute rigorous methodology with subjective, unverified assumptions`,
      `To analyze unrelated phenomena that have no direct bearing on ${topicTitle}`
    ].sort(() => 0.5 - Math.random());

    list.push({
      id: `curric-mcq-concept-${Date.now()}-1`,
      topicId: tSlug,
      questionType: 'multiple_choice',
      questionText: `What is the primary conceptual objective of studying "${topicTitle}"?`,
      options: q1Options,
      correctAnswer: `To systematically understand the foundational principles, mechanisms, and behavior of ${topicTitle}`,
      explanation: `Studying "${topicTitle}" focuses systematically on establishing core principles, operational frameworks, and validated methodologies.`,
      difficulty: 'foundational',
      category: topicTitle,
      source: 'original_engine'
    });

    // 2. Application-Based Multiple Choice
    const q2Options = [
      `To analyze real-world scenarios, optimize decision-making, and solve domain-specific problems systematically`,
      `To eliminate the need for validating evidence or observing outcomes`,
      `To prevent reproducible patterns or standard methodologies from ever being applied`,
      `Because it removes the requirement for domain knowledge or foundational principles`
    ].sort(() => 0.5 - Math.random());

    list.push({
      id: `curric-mcq-app-${Date.now()}-2`,
      topicId: tSlug,
      questionType: 'multiple_choice',
      questionText: `In practical application, why is a thorough understanding of "${topicTitle}" essential?`,
      options: q2Options,
      correctAnswer: `To analyze real-world scenarios, optimize decision-making, and solve domain-specific problems systematically`,
      explanation: `Applying "${topicTitle}" allows practitioners to diagnose challenges, make informed decisions, and solve problems systematically.`,
      difficulty: 'moderate',
      category: topicTitle,
      source: 'original_engine'
    });

    // 3. True / False Question with FALSE as correct answer
    list.push({
      id: `curric-tf-${Date.now()}-3`,
      topicId: tSlug,
      questionType: 'true_false',
      questionText: `True or False: When studying "${topicTitle}", foundational principles and assumptions can be ignored without affecting the validity of your analysis.`,
      options: ['True', 'False'],
      correctAnswer: 'False',
      explanation: `False. Foundational principles provide the critical basis for accurate analysis in "${topicTitle}"; disregarding them compromises the validity of your conclusions.`,
      difficulty: 'foundational',
      category: topicTitle,
      source: 'original_engine'
    });

    // 4. Subtopic Specific Multiple Choice
    const q4Options = [
      `It defines an essential component that establishes key concepts and operational boundaries for ${topicTitle}`,
      `It is an obsolete concept with no relevance to ${topicTitle}`,
      `It arbitrarily reverses established findings without theoretical or empirical basis`,
      `It is an unrelated external subject included solely for formatting purposes`
    ].sort(() => 0.5 - Math.random());

    list.push({
      id: `curric-mcq-sub-${Date.now()}-4`,
      topicId: tSlug,
      questionType: 'multiple_choice',
      questionText: `Which of the following statements regarding "${firstSub}" is most accurate?`,
      options: q4Options,
      correctAnswer: `It defines an essential component that establishes key concepts and operational boundaries for ${topicTitle}`,
      explanation: `"${firstSub}" is an integral core component of "${topicTitle}", establishing fundamental requirements and execution rules.`,
      difficulty,
      category: topicTitle,
      source: 'original_engine'
    });

    // 5. True / False Question with TRUE as correct answer
    list.push({
      id: `curric-tf-${Date.now()}-5`,
      topicId: tSlug,
      questionType: 'true_false',
      questionText: `True or False: A comprehensive grasp of "${secondSub}" directly reinforces your overall mastery of "${topicTitle}".`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `True. "${secondSub}" builds directly upon the principles of "${topicTitle}", and mastering it strengthens domain comprehension.`,
      difficulty: 'moderate',
      category: topicTitle,
      source: 'original_engine'
    });

    // 6. Analytical Multiple Choice
    const q6Options = [
      `Accuracy, consistency, and alignment with established domain principles`,
      `Arbitrary personal preference without systematic verification`,
      `The total number of characters used in notes or documentation`,
      `Superficial visual appearance rather than analytical rigor`
    ].sort(() => 0.5 - Math.random());

    list.push({
      id: `curric-mcq-sa-${Date.now()}-6`,
      topicId: tSlug,
      questionType: 'multiple_choice',
      questionText: `When evaluating solutions or analytical outcomes in "${secondSub}", which criterion is most critical?`,
      options: q6Options,
      correctAnswer: `Accuracy, consistency, and alignment with established domain principles`,
      explanation: `Rigorous evaluation in "${secondSub}" requires focusing on accuracy, systematic consistency, and alignment with verified principles.`,
      difficulty: 'rigorous',
      category: topicTitle,
      source: 'original_engine'
    });

    return list.slice(0, amount);
  }

  private static formatExtractedQuestion(
    documentId: string,
    projectId: string,
    raw: { questionNumber: number; text: string; options: string[]; answerText?: string; isVerified: boolean; type: QuestionType },
    documentName: string
  ): ExtractedQuestion {
    return {
      id: `ext-q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      documentId,
      projectId,
      questionText: raw.text,
      questionType: raw.type,
      options: raw.options,
      answerText: raw.answerText,
      isVerifiedAnswer: raw.isVerified,
      sourceReference: `Extracted from "${documentName}" (Question #${raw.questionNumber})`,
      difficulty: 'moderate',
      documentName
    };
  }
}
