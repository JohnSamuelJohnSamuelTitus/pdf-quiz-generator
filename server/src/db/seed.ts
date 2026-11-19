import bcrypt from 'bcryptjs';
import { getDb, run, queryOne, saveDb } from './index.js';

export async function seedDatabase() {
  console.log('Seeding LearnSphere database...');
  await getDb();

  // 1. Seed Subjects
  const subjects = [
    {
      id: 'sub-cs',
      slug: 'computer-science',
      title: 'Computer Science',
      description: 'Fundamental principles of computation, algorithms, system design, and software architecture.',
      category: 'Engineering & Computing',
      icon: 'Cpu',
      color: '#4F46E5',
      is_featured: 1
    },
    {
      id: 'sub-math',
      slug: 'mathematics',
      title: 'Mathematics',
      description: 'Rigorous analytical tools, linear algebra, calculus, and discrete mathematical structures.',
      category: 'Pure & Applied Sciences',
      icon: 'Sigma',
      color: '#059669',
      is_featured: 1
    },
    {
      id: 'sub-phys',
      slug: 'physics',
      title: 'Physics',
      description: 'Laws governing matter, energy, electromagnetic fields, and classical mechanics.',
      category: 'Natural Sciences',
      icon: 'Atom',
      color: '#D97706',
      is_featured: 1
    },
    {
      id: 'sub-bio',
      slug: 'biology',
      title: 'Life Sciences',
      description: 'Cellular processes, genetics, biological systems, and neuroscience foundations.',
      category: 'Biological Sciences',
      icon: 'Dna',
      color: '#0284C7',
      is_featured: 1
    }
  ];

  for (const s of subjects) {
    const existing = await queryOne('SELECT id FROM subjects WHERE id = ?', [s.id]);
    if (!existing) {
      await run(
        `INSERT INTO subjects (id, slug, title, description, category, icon, color, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.slug, s.title, s.description, s.category, s.icon, s.color, s.is_featured]
      );
    }
  }

  // 2. Seed Topics
  const topics = [
    // Computer Science
    {
      id: 'top-algo',
      subject_id: 'sub-cs',
      slug: 'algorithms-data-structures',
      title: 'Algorithms & Data Structures',
      summary: 'Analysis of asymptotic complexity, sorting, graphs, dynamic programming, and fundamental data structures.',
      difficulty_level: 'moderate',
      estimated_minutes: 30,
      sort_order: 1
    },
    {
      id: 'top-os',
      subject_id: 'sub-cs',
      slug: 'operating-systems',
      title: 'Operating Systems & Concurrency',
      summary: 'Process scheduling, virtual memory management, concurrency primitives, synchronization, and file systems.',
      difficulty_level: 'rigorous',
      estimated_minutes: 40,
      sort_order: 2
    },
    {
      id: 'top-arch',
      subject_id: 'sub-cs',
      slug: 'computer-architecture',
      title: 'Computer Architecture & Organization',
      summary: 'Instruction set architectures, CPU pipelining, cache hierarchies, and memory-mapped I/O.',
      difficulty_level: 'moderate',
      estimated_minutes: 35,
      sort_order: 3
    },
    {
      id: 'top-web',
      subject_id: 'sub-cs',
      slug: 'web-engineering',
      title: 'Modern Web Architecture & Protocols',
      summary: 'Client-server paradigms, REST APIs, HTTP/3, TLS security, state management, and distributed frontend systems.',
      difficulty_level: 'foundational',
      estimated_minutes: 25,
      sort_order: 4
    },

    // Mathematics
    {
      id: 'top-linalg',
      subject_id: 'sub-math',
      slug: 'linear-algebra',
      title: 'Linear Algebra & Matrix Decompositions',
      summary: 'Vector spaces, eigenvalues, eigenvectors, singular value decomposition (SVD), and linear transformations.',
      difficulty_level: 'moderate',
      estimated_minutes: 35,
      sort_order: 1
    },
    {
      id: 'top-calc',
      subject_id: 'sub-math',
      slug: 'calculus',
      title: 'Multivariable Calculus & Optimization',
      summary: 'Partial derivatives, gradient vectors, Lagrange multipliers, double and triple integrals, and vector calculus.',
      difficulty_level: 'rigorous',
      estimated_minutes: 40,
      sort_order: 2
    },
    {
      id: 'top-prob',
      subject_id: 'sub-math',
      slug: 'probability-statistics',
      title: 'Probability & Mathematical Statistics',
      summary: 'Random variables, probability distributions, Bayes theorem, hypothesis testing, and central limit theorem.',
      difficulty_level: 'moderate',
      estimated_minutes: 30,
      sort_order: 3
    },
    {
      id: 'top-discrete',
      subject_id: 'sub-math',
      slug: 'discrete-mathematics',
      title: 'Discrete Mathematics & Graph Theory',
      summary: 'Propositional logic, combinatorics, proof techniques, trees, graph connectivity, and relations.',
      difficulty_level: 'foundational',
      estimated_minutes: 25,
      sort_order: 4
    },

    // Physics
    {
      id: 'top-classical',
      subject_id: 'sub-phys',
      slug: 'classical-mechanics',
      title: 'Classical Mechanics & Dynamics',
      summary: 'Newtonian dynamics, Lagrangian and Hamiltonian mechanics, conservation laws, and oscillatory systems.',
      difficulty_level: 'moderate',
      estimated_minutes: 35,
      sort_order: 1
    },
    {
      id: 'top-em',
      subject_id: 'sub-phys',
      slug: 'electromagnetism',
      title: 'Electromagnetism & Maxwell Equations',
      summary: 'Electrostatics, Gauss law, magnetic vector potentials, Maxwell field equations, and electromagnetic waves.',
      difficulty_level: 'rigorous',
      estimated_minutes: 40,
      sort_order: 2
    },

    // Biology
    {
      id: 'top-genetics',
      subject_id: 'sub-bio',
      slug: 'molecular-genetics',
      title: 'Molecular Genetics & DNA Replication',
      summary: 'DNA transcription, RNA translation, genetic mutations, gene regulation, and CRISPR technologies.',
      difficulty_level: 'moderate',
      estimated_minutes: 30,
      sort_order: 1
    },
    {
      id: 'top-neuro',
      subject_id: 'sub-bio',
      slug: 'neuroscience',
      title: 'Neurobiology & Synaptic Transmission',
      summary: 'Action potentials, neurotransmitters, synaptic plasticity, neural circuits, and sensory encoding.',
      difficulty_level: 'moderate',
      estimated_minutes: 35,
      sort_order: 2
    }
  ];

  for (const t of topics) {
    const existing = await queryOne('SELECT id FROM topics WHERE id = ?', [t.id]);
    if (!existing) {
      await run(
        `INSERT INTO topics (id, subject_id, slug, title, summary, difficulty_level, estimated_minutes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.subject_id, t.slug, t.title, t.summary, t.difficulty_level, t.estimated_minutes, t.sort_order]
      );
    }
  }

  // 3. Seed Verified Public Learning Resources
  const resources = [
    {
      id: 'res-algo-wiki',
      topic_id: 'top-algo',
      title: 'Algorithms and Data Structures Overview',
      resource_type: 'wikipedia_overview',
      provider: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Algorithm',
      author: 'Wikipedia Educational Editors',
      description: 'Comprehensive academic introduction to algorithms, asymptotic notation, and structural complexity.'
    },
    {
      id: 'res-algo-book',
      topic_id: 'top-algo',
      title: 'Introduction to Algorithms (CLRS)',
      resource_type: 'textbook',
      provider: 'Open Library',
      url: 'https://openlibrary.org/works/OL15843403W/Introduction_to_Algorithms',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      description: 'The standard academic textbook on algorithms, spanning divide-and-conquer, graph algorithms, and data structures.'
    },
    {
      id: 'res-linalg-wiki',
      topic_id: 'top-linalg',
      title: 'Linear Algebra Foundations',
      resource_type: 'wikipedia_overview',
      provider: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Linear_algebra',
      author: 'Wikipedia Contributors',
      description: 'Rigorous exploration of vector spaces, linear transformations, matrices, and eigenvalues.'
    },
    {
      id: 'res-linalg-book',
      topic_id: 'top-linalg',
      title: 'Linear Algebra and Its Applications',
      resource_type: 'textbook',
      provider: 'Open Library',
      url: 'https://openlibrary.org/works/OL2747124W/Linear_Algebra_and_Its_Applications',
      author: 'Gilbert Strang',
      description: 'Renowned text connecting linear algebra theory to computer science, physics, and machine learning.'
    }
  ];

  for (const r of resources) {
    const existing = await queryOne('SELECT id FROM learning_resources WHERE id = ?', [r.id]);
    if (!existing) {
      await run(
        `INSERT INTO learning_resources (id, topic_id, title, resource_type, provider, url, author, description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.topic_id, r.title, r.resource_type, r.provider, r.url, r.author, r.description, '{}']
      );
    }
  }

  // 4. Seed Demo Student Account for Evaluators
  const demoUserId = 'user-demo-student';
  const existingUser = await queryOne('SELECT id FROM users WHERE id = ?', [demoUserId]);

  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Password123!', salt);

    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [demoUserId, 'student@learnsphere.edu', hash, 'Alex Morgan', 'student']
    );

    // Preferences
    await run(
      `INSERT INTO student_preferences (user_id, interests, primary_subjects, skill_level, learning_objectives, preferred_difficulty, daily_goal_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        demoUserId,
        JSON.stringify(['Software Engineering', 'System Architecture', 'Linear Algebra']),
        JSON.stringify(['computer-science', 'mathematics']),
        'intermediate',
        JSON.stringify(['Master core data structures', 'Prepare for technical exams']),
        'moderate',
        30
      ]
    );

    // Initial student progress
    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score, last_studied_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['prog-1', demoUserId, 'top-algo', 'in_progress', 65.0]
    );

    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score, last_studied_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ['prog-2', demoUserId, 'top-linalg', 'in_progress', 45.0]
    );

    // Initial learning session
    await run(
      `INSERT INTO learning_sessions (id, user_id, topic_id, duration_seconds, notes, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'sess-1',
        demoUserId,
        'top-algo',
        1800,
        'Reviewed binary search trees and amortized time complexity in hash tables.',
        'completed'
      ]
    );

    // Initial quiz attempt
    const attemptId = 'att-demo-1';
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [attemptId, demoUserId, 'top-algo', 'moderate', 5, 4, 80.0, 240]
    );

    // Answers for the attempt
    await run(
      `INSERT INTO quiz_answers (id, attempt_id, question_id, question_text, selected_option, correct_option, is_correct, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'ans-1',
        attemptId,
        'q-1',
        'What is the worst-case time complexity of QuickSort?',
        'O(n^2)',
        'O(n^2)',
        1,
        'When the pivot selection consistently yields unbalanced partitions, QuickSort degrades to O(n^2).'
      ]
    );
  }

  saveDb();
  console.log('Database seeded successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
