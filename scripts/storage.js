/* scripts/storage.js — IIFE Module: all localStorage persistence */
;(function (App) {
  'use strict';

  /* ── Storage keys ─────────────────────────────────────────── */
  var KEYS = {
    records:  'alu:records',
    notes:    'alu:notes',
    users:    'alu:users',
    session:  'alu:session',
    theme:    'alu:theme',
  };
  /* Per-user settings key: alu:settings:{userId} */
  function settingsKey(uid) { return 'alu:settings:' + (uid || 'default'); }

  /* ── Generic helpers ──────────────────────────────────────── */
  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { /* storage full — silent */ }
  }

  /* ── Seed data ────────────────────────────────────────────── */
  var SEED_USERS = [
    {
      id: 'u_fac_001',
      name: 'Dr. Sarah M.',
      email: 'facilitator@alu.edu',
      passwordHash: btoa('Facilitate1!'),
      role: 'facilitator',
      class: 'ALL',
      mission: 'Guiding ALU capstone cohort to excellence',
      bio: 'ALU Faculty — Building Responsive UI module lead',
      createdAt: '2025-08-01T00:00:00.000Z',
      updatedAt: '2025-08-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_001',
      name: 'Akotet Demise',
      email: 'a.demise@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'BSE-FY',
      mission: 'Building Accessible Research Platforms for Ethiopian Students',
      missionDesc: 'Designing and developing accessible, mobile-first web interfaces for research data management at ALU, focusing on usability for students in low-bandwidth environments across Ethiopia.',
      bio: 'BSE Final Year — web engineering and accessible UI systems',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_002',
      name: 'Alice Kamara',
      email: 'a.kamara@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'BSE-FY',
      mission: 'AI-Powered Diagnostics for Rural Healthcare in West Africa',
      missionDesc: 'Building machine learning pipelines for early disease detection in resource-constrained healthcare settings across Sierra Leone and Ghana.',
      bio: 'BSE Final Year — machine learning and health-tech applications',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_003',
      name: 'Bob Nkosi',
      email: 'b.nkosi@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'BEL-FY',
      mission: 'Youth Employment Platform for East African Graduates',
      missionDesc: 'Creating a social enterprise that connects recent graduates with short-term skills-based work in Kenya, Tanzania, and Ethiopia through a mobile-first platform.',
      bio: 'BEL Final Year — social entrepreneurship and venture design',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_004',
      name: 'Chioma Obi',
      email: 'c.obi@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'IBT-FY',
      mission: 'Cross-Border AgriTrade Digitisation in the COMESA Region',
      missionDesc: 'Developing a digital marketplace to streamline agricultural commodity trade across COMESA member states, reducing friction and improving price transparency for smallholder farmers.',
      bio: 'IBT Final Year — international trade and digital marketplaces',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_005',
      name: 'David Mensah',
      email: 'd.mensah@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'IBT-FY',
      mission: 'FinTech for Cross-Border Remittances in the African Corridor',
      missionDesc: 'Designing a low-cost remittance system for the Ghana–Nigeria–Ethiopia trade corridor, leveraging mobile money infrastructure to cut transfer fees below 1%.',
      bio: 'IBT Final Year — financial systems and cross-border trade',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    },
    {
      id: 'u_stu_006',
      name: 'Fatima Al-Hassan',
      email: 'f.alhassan@alustudent.com',
      passwordHash: btoa('Student1!'),
      role: 'student',
      class: 'BEL-FY',
      mission: 'EdTech Startup for Arabic-Speaking Learners in the Sahel',
      missionDesc: 'Building an adaptive learning platform in Arabic and Hausa for secondary students in Chad, Niger, and northern Nigeria who lack access to quality digital education resources.',
      bio: 'BEL Final Year — education entrepreneurship and product leadership',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    }
  ];

  var SEED_RECORDS = [
    {
      id: 'rec_0001',
      userId: 'u_fac_001',
      title: 'The Lean Startup',
      author: 'Ries, Eric',
      pages: 336,
      status: 'finished',
      tag: 'Entrepreneurship',
      dateAdded: '2025-09-10',
      notes: 'Core MVP framework. Build-Measure-Learn is key.',
      recommended: true,
      coverColor: '#0F2A5C',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'The Lean Startup by Eric Ries presents a scientific approach to creating and managing successful startups in an age when companies need to innovate more than ever. The core premise is the Build-Measure-Learn feedback loop: entrepreneurs should build a minimum viable product, measure how customers respond, and learn whether to pivot or persevere. This methodology is especially relevant for African startup ecosystems where resources are constrained and market validation is critical before scaling. Ries argues that the biggest waste is building something no one wants, a lesson deeply applicable to Ethiopian entrepreneurs navigating uncertain markets. The concept of validated learning replaces gut-feel decisions with data-driven iteration cycles. For ALU capstone students, this book provides a practical framework for testing research-backed business hypotheses without burning through limited capital. The pivot-or-persevere decision framework helps founders distinguish between a flawed strategy and a flawed execution, an essential distinction for early-stage ventures across Sub-Saharan Africa.',
      isbn: '978-0-307-88789-4',
      createdAt: '2025-09-10T08:00:00.000Z',
      updatedAt: '2025-09-10T08:00:00.000Z'
    },
    {
      id: 'rec_0002',
      userId: 'u_fac_001',
      title: 'Design Thinking for Innovation',
      author: 'Brown, Tim',
      pages: 272,
      status: 'reading',
      tag: 'Design Thinking',
      dateAdded: '2025-10-02',
      notes: 'Chapter 3 most relevant to my problem statement.',
      recommended: false,
      coverColor: '#6B1A2A',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780061766084-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Design Thinking for Innovation by Tim Brown, CEO of IDEO, introduces human-centered design as a methodology for solving complex problems by empathizing with real users. The book outlines a process of inspiration, ideation, and implementation that places human needs at the center of every design decision. In the Ethiopian and broader African context, this approach is invaluable because imported solutions often fail to account for local cultural norms, infrastructure realities, and behavioral patterns. Brown illustrates how deep user research, ethnographic observation, and rapid prototyping can surface insights that conventional market research misses entirely. For ALU students tackling social and economic challenges, design thinking offers a structured way to move from abstract problem statements to concrete, testable prototypes. The book emphasizes that design is not just about aesthetics but about creating meaningful experiences and functional systems. It challenges students to embrace ambiguity, iterate fearlessly, and always return to the human perspective when evaluating potential solutions.',
      isbn: '978-0-06-176608-4',
      createdAt: '2025-10-02T09:00:00.000Z',
      updatedAt: '2025-10-02T09:00:00.000Z'
    },
    {
      id: 'rec_0003',
      userId: 'u_fac_001',
      title: 'Good to Great',
      author: 'Collins, Jim',
      pages: 300,
      status: 'want',
      tag: 'Leadership',
      dateAdded: '2025-11-15',
      notes: '',
      recommended: false,
      coverColor: '#1E3A6E',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780066620992-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Good to Great by Jim Collins examines why some companies make the leap from good performance to great results while others do not. Through rigorous research spanning five years and analyzing decades of corporate data, Collins and his team identified recurring patterns that distinguish truly great companies. The findings are highly relevant to African leadership contexts, where organizations often plateau at mediocrity due to weak institutional culture, misaligned incentives, and unclear strategic focus. Central concepts include Level 5 Leadership, where humble but fiercely determined leaders drive transformation without ego, the Hedgehog Concept, which is the intersection of passion, capability, and economic opportunity, and the Flywheel Effect, illustrating how sustained consistent effort builds unstoppable organizational momentum. For Ethiopian business leaders and social entrepreneurs, the book offers a counterintuitive message: greatness comes from disciplined people making disciplined decisions in a culture of disciplined thought. These principles apply directly to building sustainable institutions across Sub-Saharan Africa.',
      isbn: '978-0-06-662099-2',
      createdAt: '2025-11-15T10:00:00.000Z',
      updatedAt: '2025-11-15T10:00:00.000Z'
    },
    {
      id: 'rec_0004',
      userId: 'u_fac_001',
      title: 'Factfulness',
      author: 'Rosling, Hans',
      pages: 342,
      status: 'finished',
      tag: 'Global Development',
      dateAdded: '2025-09-28',
      notes: 'Changed how I think about presenting data.',
      recommended: true,
      coverColor: '#0D3D6B',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781250107817-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Factfulness by Hans Rosling, Ola Rosling, and Anna Rosling Ronnlund is a revelatory guide to seeing the world through accurate data rather than instinct and outdated narratives. The book identifies ten instincts that systematically distort our worldview, including the gap instinct, which falsely divides the world into rich and poor, and the negativity instinct, which makes us believe things are getting worse when global indicators are largely improving. These insights are particularly powerful for researchers studying Africa, where Western media narratives often present a monolithic story of poverty and despair that the actual data refutes. Rosling demonstrates that Ethiopia, like many African nations, has made dramatic measurable progress in child mortality, life expectancy, and access to education over the past two decades. For ALU data science and research students, this book is essential reading because it shows how to construct compelling evidence-based arguments, challenge conventional wisdom with rigorous statistics, and present data in ways that shift audience perceptions constructively.',
      isbn: '978-1-250-10781-7',
      createdAt: '2025-09-28T11:00:00.000Z',
      updatedAt: '2025-09-28T11:00:00.000Z'
    },
    {
      id: 'rec_0005',
      userId: 'u_fac_001',
      title: "The Innovator's Dilemma",
      author: 'Christensen, Clayton',
      pages: 288,
      status: 'finished',
      tag: 'Innovation',
      dateAdded: '2025-10-18',
      notes: 'Disruptive innovation theory for my capstone sector.',
      recommended: true,
      coverColor: '#1a3d7c',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780060521998-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: "The Innovator's Dilemma by Clayton Christensen explains why successful companies often fail when confronted with disruptive innovations and how smaller, newer entrants use technology to overturn established market leaders. Christensen distinguishes between sustaining innovations, which improve existing products for existing customers, and disruptive innovations, which initially serve overlooked markets before eventually displacing incumbents. This framework is extraordinarily relevant to understanding technology leapfrogging in Africa, where countries like Ethiopia are bypassing legacy infrastructure entirely. Mobile banking, solar microgrids, and satellite internet are classic disruptive innovations that thrive precisely because they serve populations that established providers ignored. For ALU students researching technology adoption in developing markets, this book provides the theoretical vocabulary to articulate why certain technologies succeed where others fail in low-income contexts. Christensen's case studies from the disk drive, steel, and retail industries translate directly into lessons about how African startups can compete with global giants by targeting the bottom of the pyramid first.",
      isbn: '978-0-06-052199-8',
      createdAt: '2025-10-18T08:30:00.000Z',
      updatedAt: '2025-10-18T08:30:00.000Z'
    },
    {
      id: 'rec_0006',
      userId: 'u_fac_001',
      title: 'Sprint',
      author: 'Knapp, Jake',
      pages: 288,
      status: 'reading',
      tag: 'Software Development',
      dateAdded: '2025-11-01',
      notes: 'Using 5-day sprint for prototyping.',
      recommended: false,
      coverColor: '#0F2A5C',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781501121746-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Sprint by Jake Knapp, John Zeratsky, and Braden Kowitz introduces a five-day process for answering critical business questions through rapid prototyping and user testing, developed at Google Ventures. The methodology condenses months of iterative work into a single focused week: Monday is for mapping the problem, Tuesday for sketching solutions, Wednesday for deciding which to build, Thursday for prototyping, and Friday for testing with real users. This compressed timeline is enormously valuable for product teams in resource-constrained environments like African startups, where lengthy development cycles drain capital before any market validation occurs. The book provides concrete templates, facilitation scripts, and decision-making tools that any team can adopt immediately. For ALU capstone students building digital products, Sprint offers a structured way to move from a vague research question to a concrete, user-tested prototype in five days. The emphasis on real user feedback over internal opinions aligns perfectly with the human-centered design principles critical to building products that solve authentic African problems.',
      isbn: '978-1-5011-2174-6',
      createdAt: '2025-11-01T14:00:00.000Z',
      updatedAt: '2025-11-01T14:00:00.000Z'
    },
    {
      id: 'rec_0007',
      userId: 'u_fac_001',
      title: 'Zero to One',
      author: 'Thiel, Peter',
      pages: 195,
      status: 'finished',
      tag: 'Entrepreneurship',
      dateAdded: '2025-09-05',
      notes: 'Every capstone student should read this first.',
      recommended: true,
      coverColor: '#0F2A5C',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780804139281-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Zero to One by Peter Thiel with Blake Masters argues that true innovation means creating something entirely new rather than incrementally improving what already exists. Going from zero to one is the hardest and most valuable kind of progress, distinct from going from one to n by copying what works. Thiel challenges the conventional wisdom that competition is healthy, arguing instead that monopolies are the engine of innovation because they have the resources to think long-term and invest in transformative R&D. For African entrepreneurs, this philosophy reframes the startup challenge: rather than competing in crowded markets, the goal is to identify secrets, hidden truths that most people refuse to accept, and build businesses around them. Thiel encourages founders to ask what valuable company is nobody building right now, a question that resonates deeply in Ethiopia where genuine market gaps in healthcare, logistics, and financial services remain unaddressed by local innovation. The book also covers founder psychology, the power law of venture returns, and the importance of building a strong founding team.',
      isbn: '978-0-8041-3929-8',
      createdAt: '2025-09-05T07:00:00.000Z',
      updatedAt: '2025-09-05T07:00:00.000Z'
    },
    {
      id: 'rec_0008',
      userId: 'u_fac_001',
      title: 'Thinking Fast and Slow',
      author: 'Kahneman, Daniel',
      pages: 499,
      status: 'want',
      tag: 'Behavioral Economics',
      dateAdded: '2025-11-20',
      notes: '',
      recommended: false,
      coverColor: '#4A1A0A',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Thinking Fast and Slow by Daniel Kahneman, Nobel laureate in economics, presents a comprehensive tour of the human mind and explains the two systems that drive the way we think. System 1 operates automatically and quickly with little or no effort and no sense of voluntary control, while System 2 allocates attention to effortful mental activities including complex computations and deliberate decision-making. Kahneman reveals the extraordinary capabilities and also the faults and biases of fast thinking, and the pervasive influence of intuitive impressions on our thoughts and behavior. For researchers and data analysts working on behavioral interventions in African contexts, this book is foundational because it explains why rational information campaigns often fail to change behavior and why defaults, framing effects, and social norms are far more powerful levers. Understanding cognitive biases like the availability heuristic, anchoring, and loss aversion helps Ethiopian policymakers and social entrepreneurs design interventions that work with human psychology rather than against it.',
      isbn: '978-0-374-53355-7',
      createdAt: '2025-11-20T09:00:00.000Z',
      updatedAt: '2025-11-20T09:00:00.000Z'
    },
    {
      id: 'rec_0009',
      userId: 'u_fac_001',
      title: 'Start with Why',
      author: 'Sinek, Simon',
      pages: 256,
      status: 'finished',
      tag: 'Leadership',
      dateAdded: '2025-09-20',
      notes: 'Helped clarify my capstone purpose statement.',
      recommended: false,
      coverColor: '#1E3A6E',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781591842804-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Start with Why by Simon Sinek introduces the Golden Circle framework, which explains why some leaders and organizations inspire action while others do not. Most organizations communicate from the outside in, starting with what they do, then how they do it. But truly inspiring leaders start with why, their fundamental purpose, cause, or belief. Sinek argues that people do not buy what you do but why you do it, making the why the most powerful driver of loyal customers, engaged employees, and lasting movements. For African leaders and social entrepreneurs, this framework is especially compelling because mission-driven organizations often struggle to articulate their purpose in ways that resonate beyond their immediate communities. Ethiopian institutions building public health systems, education platforms, or agricultural cooperatives need a clear why to sustain momentum through the inevitable setbacks of operating in complex, underserved environments. The book draws on examples from Apple, Martin Luther King Jr., and the Wright Brothers to show how clarity of purpose drives extraordinary results across every domain.',
      isbn: '978-1-59184-280-4',
      createdAt: '2025-09-20T10:00:00.000Z',
      updatedAt: '2025-09-20T10:00:00.000Z'
    },
    {
      id: 'rec_0010',
      userId: 'u_fac_001',
      title: 'Weapons of Math Destruction',
      author: "O'Neil, Cathy",
      pages: 272,
      status: 'finished',
      tag: 'Data Science',
      dateAdded: '2025-10-10',
      notes: 'Critical lens on algorithmic bias — AI ethics section.',
      recommended: true,
      coverColor: '#0D3D6B',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780553418810-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: "Weapons of Math Destruction by Cathy O'Neil is a sobering examination of how big data algorithms can reinforce inequality, circumvent due process, and undermine democracy when deployed without adequate accountability. O'Neil, a mathematician who worked on Wall Street, coins the term Weapons of Math Destruction to describe algorithms that are opaque, unregulated, and destructive, particularly to the vulnerable. She examines cases in education, employment, criminal justice, and insurance where algorithmic systems systematically penalize the poor while rewarding those already advantaged. For AI researchers working in the African context, this book is essential reading because algorithmic bias risks are amplified when models trained on Western data are applied to Ethiopian populations with different socioeconomic profiles, languages, and cultural contexts. The book provides a critical framework for evaluating any data system: Is the model transparent? Can it be contested? Does it account for feedback loops? These questions are fundamental to building ethical AI systems for healthcare, credit scoring, and public services across Sub-Saharan Africa.",
      isbn: '978-0-553-41881-1',
      createdAt: '2025-10-10T08:00:00.000Z',
      updatedAt: '2025-10-10T08:00:00.000Z'
    },
    {
      id: 'rec_0011',
      userId: 'u_fac_001',
      title: 'African Founders',
      author: 'Obeng, Walter',
      pages: 320,
      status: 'reading',
      tag: 'Entrepreneurship',
      dateAdded: '2025-11-08',
      notes: 'African startup case studies — local context research.',
      recommended: true,
      coverColor: '#0F2A5C',
      coverUrl: '',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'African Founders by Walter Obeng documents the rise of African entrepreneurship through detailed case studies of successful startup founders across the continent, from Lagos to Nairobi to Addis Ababa. The book challenges the persistent narrative that Africa lacks the entrepreneurial talent and institutional support needed to build world-class technology companies. Through interviews and analysis, Obeng reveals the unique advantages that African founders bring to market, including deep cultural insight, resilience born of operating in difficult environments, and the ability to solve genuinely novel problems at scale. For Ethiopian students, this book provides both inspiration and practical frameworks drawn from local context rather than Silicon Valley mythology. Obeng examines the specific challenges African founders face, including regulatory barriers, talent acquisition in thin labor markets, limited access to patient capital, and the psychological burden of operating in environments where failure carries severe social stigma. He also analyzes how successful founders have built pan-African networks, leveraged diaspora connections, and attracted international investment by leading with their local expertise.',
      isbn: '978-0-00-000011-0',
      createdAt: '2025-11-08T09:00:00.000Z',
      updatedAt: '2025-11-08T09:00:00.000Z'
    },
    {
      id: 'rec_0012',
      userId: 'u_fac_001',
      title: 'The Art of Problem Solving',
      author: 'Lehoczky, Sandor',
      pages: 272,
      status: 'want',
      tag: 'Computing',
      dateAdded: '2025-12-01',
      notes: '',
      recommended: false,
      coverColor: '#0D1A6B',
      coverUrl: '',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'The Art of Problem Solving by Sandor Lehoczky and Richard Rusczyk is a rigorous mathematical problem-solving text that develops the analytical reasoning skills essential for advanced research and competitive mathematics. The book covers topics from basic algebra and geometry through combinatorics, number theory, and proof techniques, with hundreds of challenging problems drawn from mathematical olympiads worldwide. For research students at ALU and similar African institutions, strong mathematical foundations are increasingly critical as data science, operations research, and quantitative policy analysis become central tools for development work. The problem-solving methodologies taught in this book, including systematic case analysis, invariant identification, and recursive decomposition, transfer directly to research design, algorithm development, and analytical modeling. Ethiopian students pursuing careers in computer science, economics, or engineering benefit enormously from the kind of structured, creative mathematical thinking this book cultivates. Beyond the content, the book instills a growth mindset about difficulty: hard problems are not signs of inadequacy but invitations to think more deeply and creatively.',
      isbn: '978-0-97-720803-1',
      createdAt: '2025-12-01T08:00:00.000Z',
      updatedAt: '2025-12-01T08:00:00.000Z'
    },
    {
      id: 'rec_0013',
      userId: 'u_fac_001',
      title: 'Deep Learning',
      author: 'Goodfellow, Ian',
      pages: 800,
      status: 'reading',
      tag: 'AI & Machine Learning',
      dateAdded: '2025-09-15',
      notes: 'Dense but essential for ML capstone students.',
      recommended: true,
      coverColor: '#0D1A6B',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Deep Learning by Ian Goodfellow, Yoshua Bengio, and Aaron Courville is the definitive textbook on modern deep learning, covering the mathematical foundations, core architectures, and training methodologies that underpin contemporary artificial intelligence systems. The book begins with the linear algebra, probability theory, and information theory needed to understand neural networks, then builds through feedforward networks, convolutional networks for computer vision, recurrent networks for sequence modeling, and generative models including variational autoencoders and generative adversarial networks. For ALU students pursuing AI research with applications to African healthcare, agricultural monitoring, or language technology, this book provides the rigorous technical foundation necessary to understand, implement, and critically evaluate state-of-the-art machine learning systems. Alice Kamara and other students working on healthcare AI need to understand not just how to use deep learning libraries but why these architectures work and where they fail, especially on low-resource languages and datasets that under-represent African populations. The book bridges theory and practice with sufficient depth to enable original research contributions.',
      isbn: '978-0-262-03561-3',
      createdAt: '2025-09-15T10:00:00.000Z',
      updatedAt: '2025-09-15T10:00:00.000Z'
    },
    {
      id: 'rec_0014',
      userId: 'u_fac_001',
      title: 'The Master Algorithm',
      author: 'Domingos, Pedro',
      pages: 352,
      status: 'finished',
      tag: 'AI & Machine Learning',
      dateAdded: '2025-10-01',
      notes: 'Good intuition builder for non-specialists.',
      recommended: false,
      coverColor: '#0D1A6B',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780465065707-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'The Master Algorithm by Pedro Domingos is an accessible and intellectually stimulating tour through the five major schools of machine learning: symbolists who use logic and rules, connectionists who model the brain through neural networks, evolutionists who apply genetic algorithms, Bayesians who reason under uncertainty using probabilistic inference, and analogizers who learn by similarity through support vector machines. Domingos poses the provocative question of whether a single master algorithm exists that could learn everything from all available data and unify these five approaches into one universal learner. This conceptual survey is invaluable for ALU students who need to understand the landscape of machine learning without necessarily diving into full mathematical proofs. For researchers applying AI to African problems in healthcare diagnostics, crop disease detection, or credit risk assessment, understanding the philosophical underpinnings and practical tradeoffs of different learning paradigms enables better architectural choices. The book demystifies AI for interdisciplinary audiences while still offering enough depth to satisfy technically inclined readers, making it ideal for a diverse African research community.',
      isbn: '978-0-465-06570-7',
      createdAt: '2025-10-01T09:00:00.000Z',
      updatedAt: '2025-10-01T09:00:00.000Z'
    },
    {
      id: 'rec_0015',
      userId: 'u_fac_001',
      title: 'Social Entrepreneurship',
      author: 'Bornstein, David',
      pages: 320,
      status: 'finished',
      tag: 'Social Entrepreneurship',
      dateAdded: '2025-09-20',
      notes: 'Core reference for youth employment ventures.',
      recommended: true,
      coverColor: '#1A3D6B',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9780195397659-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Social Entrepreneurship: What Everyone Needs to Know by David Bornstein and Susan Davis provides a comprehensive introduction to social entrepreneurship as a field, a movement, and a practice. The book defines social entrepreneurs as individuals who combine the mission-driven passion of activists with the efficiency-oriented thinking of business innovators to create sustainable solutions to persistent social problems. Drawing on case studies from Grameen Bank in Bangladesh to the Aravind Eye Care System in India to youth employment programs across East Africa, Bornstein and Davis illustrate how social ventures can achieve scale by designing self-reinforcing systems rather than depending on perpetual philanthropic funding. For Bob Nkosi and other ALU students building ventures for youth employment in East Africa, this book provides a critical framework for thinking about impact measurement, organizational sustainability, and the difference between charity and systems change. The authors examine how social entrepreneurs identify root causes of problems rather than symptoms, build collaborative ecosystems with governments and communities, and measure success through social return on investment rather than financial returns alone.',
      isbn: '978-0-19-539765-7',
      createdAt: '2025-09-20T08:00:00.000Z',
      updatedAt: '2025-09-20T08:00:00.000Z'
    },
    {
      id: 'rec_0016',
      userId: 'u_fac_001',
      title: 'Doughnut Economics',
      author: 'Raworth, Kate',
      pages: 320,
      status: 'reading',
      tag: 'Sustainability',
      dateAdded: '2025-10-05',
      notes: 'Framework for sustainable boundaries — AgriTech reading.',
      recommended: false,
      coverColor: '#0D3D2A',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9781603587440-L.jpg',
      pdfUrl: '',
      approved: true,
      approvedBy: 'u_fac_001',
      approvedAt: '2025-09-01T00:00:00.000Z',
      addedByFacilitator: true,
      description: 'Doughnut Economics by Kate Raworth proposes a new economic framework for the twenty-first century that operates within planetary boundaries while ensuring a social foundation for all people. The doughnut shape represents the safe and just space for humanity, bounded above by ecological ceilings such as climate change, biodiversity loss, and freshwater depletion, and bounded below by a social foundation of essential needs including food, health, education, and political voice. This framework is particularly relevant to African agricultural development, where the imperative to lift rural communities out of poverty must be balanced against the ecological consequences of intensified land use, water extraction, and chemical inputs. For Chioma Obi and other ALU students working on sustainable AgriTech solutions, Raworth provides both the theoretical justification and practical vocabulary for designing agricultural systems that are regenerative rather than extractive. The book challenges the GDP growth imperative that dominates development economics and proposes circular economy principles, distributive design, and regenerative agriculture as pathways to genuine human flourishing within ecological limits in Ethiopia and across the continent.',
      isbn: '978-1-60358-744-6',
      createdAt: '2025-10-05T10:00:00.000Z',
      updatedAt: '2025-10-05T10:00:00.000Z'
    }
  ];

  /* ── Public API ───────────────────────────────────────────── */
  App.storage = {

    /* Records */
    loadRecords:  function ()      { return load(KEYS.records, []); },
    saveRecords:  function (data)  { save(KEYS.records, data); },

    /* Notes */
    loadNotes:    function ()      { return load(KEYS.notes, []); },
    saveNotes:    function (data)  { save(KEYS.notes, data); },

    /* Users */
    loadUsers:    function ()      { return load(KEYS.users, []); },
    saveUsers:    function (data)  { save(KEYS.users, data); },

    /* Session */
    loadSession:  function ()      { return load(KEYS.session, null); },
    saveSession:  function (sess)  { save(KEYS.session, sess); },
    clearSession: function ()      { localStorage.removeItem(KEYS.session); },

    /* Theme */
    loadTheme:    function ()      { return localStorage.getItem(KEYS.theme) || 'light'; },
    saveTheme:    function (t)     { localStorage.setItem(KEYS.theme, t === 'dark' ? 'dark' : 'light'); },

    /* Per-user settings */
    loadUserSettings: function (uid) {
      return load(settingsKey(uid), { goal: 0, ppm: 1.5 });
    },
    saveUserSettings: function (uid, s) {
      save(settingsKey(uid), s);
    },

    /* Approve a record */
    approveRecord: function (recordId, facilitatorId) {
      var recs = this.loadRecords();
      var idx  = recs.findIndex(function (r) { return r.id === recordId; });
      if (idx === -1) return false;
      recs[idx].approved    = true;
      recs[idx].approvedBy  = facilitatorId;
      recs[idx].approvedAt  = new Date().toISOString();
      delete recs[idx].rejectedReason;
      this.saveRecords(recs);
      return true;
    },

    /* Reject a record */
    rejectRecord: function (recordId, reason) {
      var recs = this.loadRecords();
      var idx  = recs.findIndex(function (r) { return r.id === recordId; });
      if (idx === -1) return false;
      recs[idx].approved        = false;
      recs[idx].rejectedReason  = reason || 'No reason provided';
      delete recs[idx].approvedBy;
      delete recs[idx].approvedAt;
      this.saveRecords(recs);
      return true;
    },

    /* Dangerous */
    clearUserData: function (uid) {
      var recs  = this.loadRecords().filter(function (r) { return r.userId !== uid; });
      var notes = this.loadNotes().filter(function (n) { return n.userId !== uid; });
      this.saveRecords(recs);
      this.saveNotes(notes);
      localStorage.removeItem(settingsKey(uid));
    },

    /* Import validation — approved field is optional */
    validateImport: function (data) {
      if (!Array.isArray(data)) return false;
      return data.every(function (r) {
        return typeof r.id         === 'string' &&
               typeof r.title     === 'string' &&
               typeof r.author    === 'string' &&
               r.pages            !== undefined &&
               typeof r.tag       === 'string' &&
               typeof r.status    === 'string' &&
               typeof r.dateAdded === 'string' &&
               typeof r.createdAt === 'string';
      });
    },

    /* Reading progress tracking */
    loadProgress: function () { return load('alu:progress', []); },
    saveProgress: function (data) { save('alu:progress', data); },

    updateProgress: function (uid, bookId, currentPage, totalPages) {
      var progs = this.loadProgress();
      var idx   = progs.findIndex(function (p) { return p.userId === uid && p.bookId === bookId; });
      var pct   = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
      var now   = new Date().toISOString();
      if (idx === -1) {
        progs.push({
          id:          'prog_' + Date.now().toString(36),
          userId:      uid,
          bookId:      bookId,
          currentPage: currentPage,
          totalPages:  totalPages,
          percent:     pct,
          startedAt:   now,
          lastReadAt:  now,
          completed:   pct >= 100,
        });
      } else {
        progs[idx].currentPage = currentPage;
        progs[idx].totalPages  = totalPages;
        progs[idx].percent     = pct;
        progs[idx].lastReadAt  = now;
        progs[idx].completed   = pct >= 100;
      }
      this.saveProgress(progs);
    },

    getProgress: function (uid, bookId) {
      return this.loadProgress().find(function (p) {
        return p.userId === uid && p.bookId === bookId;
      }) || null;
    },

    getUserProgress: function (uid) {
      return this.loadProgress().filter(function (p) { return p.userId === uid; });
    },

    /* One-time seed: called by auth.js on first page load */
    seed: function () {
      if (this.loadUsers().length === 0) {
        this.saveUsers(SEED_USERS);
      }
      if (this.loadRecords().length === 0) {
        this.saveRecords(SEED_RECORDS);
      } else {
        /* Migration: patch existing seed records with coverUrl + addedByFacilitator */
        var coverMap = {
          'rec_0001': 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg',
          'rec_0002': 'https://covers.openlibrary.org/b/isbn/9780061766084-L.jpg',
          'rec_0003': 'https://covers.openlibrary.org/b/isbn/9780066620992-L.jpg',
          'rec_0004': 'https://covers.openlibrary.org/b/isbn/9781250107817-L.jpg',
          'rec_0005': 'https://covers.openlibrary.org/b/isbn/9780060521998-L.jpg',
          'rec_0006': 'https://covers.openlibrary.org/b/isbn/9781501121746-L.jpg',
          'rec_0007': 'https://covers.openlibrary.org/b/isbn/9780804139281-L.jpg',
          'rec_0008': 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
          'rec_0009': 'https://covers.openlibrary.org/b/isbn/9781591842804-L.jpg',
          'rec_0010': 'https://covers.openlibrary.org/b/isbn/9780553418810-L.jpg',
          'rec_0013': 'https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg',
          'rec_0014': 'https://covers.openlibrary.org/b/isbn/9780465065707-L.jpg',
          'rec_0015': 'https://covers.openlibrary.org/b/isbn/9780195397659-L.jpg',
          'rec_0016': 'https://covers.openlibrary.org/b/isbn/9781603587440-L.jpg'
        };
        var recs = this.loadRecords();
        var changed = false;
        recs.forEach(function (r) {
          if (coverMap[r.id] && !r.coverUrl) { r.coverUrl = coverMap[r.id]; changed = true; }
          if (!r.addedByFacilitator && r.approved && r.approvedBy === 'u_fac_001') {
            r.addedByFacilitator = true; changed = true;
          }
        });
        /* Tag migration: update old generic tags to program-specific ones */
        var tagMap = {
          'Design': 'Design Thinking', 'Data': 'Global Development',
          'Product': 'Software Development', 'Psychology': 'Behavioral Economics',
          'Social Impact': 'Social Entrepreneurship', 'Research Methods': 'Computing',
          'AI': 'AI & Machine Learning'
        };
        recs.forEach(function (r) {
          if (tagMap[r.tag]) { r.tag = tagMap[r.tag]; changed = true; }
        });
        /* Merge any new seed records not yet in storage */
        var existingIds = recs.map(function (r) { return r.id; });
        SEED_RECORDS.forEach(function (sr) {
          if (existingIds.indexOf(sr.id) === -1) { recs.push(sr); changed = true; }
        });
        if (changed) this.saveRecords(recs);
      }
      /* Migration: update user classes to new BSE/BEL/IBT codes */
      var classMap = { 'CS-2025-A': 'BSE-FY', 'CS-2025-B': 'BSE-FY', 'BUS-2025-A': 'BEL-FY', 'BUS-2025-B': 'BEL-FY', 'ENV-2025-A': 'IBT-FY', 'HUM-2025-A': 'BEL-FY' };
      var users = this.loadUsers();
      var usersChanged = false;
      users.forEach(function (u) {
        if (classMap[u.class]) { u.class = classMap[u.class]; usersChanged = true; }
      });
      if (usersChanged) this.saveUsers(users);
    }
  };

})(window.App = window.App || {});

