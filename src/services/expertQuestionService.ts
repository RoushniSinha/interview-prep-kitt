import { Question, QuestionCategory, Citation, Requirement } from '../core/types';

export interface SubcategoryMeta {
  id: string;
  name: string;
  description: string;
  category: QuestionCategory;
  primaryLiterature: string;
  aliases?: string[];
}

export function canonicalizeSubcategory(name?: string): string {
  if (!name) return 'General Competencies';
  const n = name.trim().toLowerCase();
  if (
    n === 'data structures' ||
    n === 'data_structures' ||
    n === 'algorithms & data structures' ||
    n === 'algorithms' ||
    n === 'dsa' ||
    n.includes('data structure') ||
    n.includes('algorithm')
  ) {
    return 'Data Structures';
  }
  if (n === 'system design' || n === 'system_design' || n.includes('system design') || n.includes('distributed architecture')) {
    return 'System Design';
  }
  if (n.includes('concurrency') || n.includes('thread safety')) {
    return 'Concurrency & Thread Safety';
  }
  if (n.includes('database') || n.includes('storage') || n.includes('query engine')) {
    return 'Database Storage & Query Engines';
  }
  if (n.includes('network') || n.includes('api contract') || n.includes('protocol')) {
    return 'Network Protocols & API Contracts';
  }
  if (n.includes('debugging') || n.includes('triage') || n.includes('incident')) {
    return 'Production Debugging & Incident Triage';
  }
  return name.trim();
}

export function mapSeniorityToTargetDifficulty(seniority?: string, roleTitle?: string): 1 | 2 | 3 {
  const combined = `${seniority || ''} ${roleTitle || ''}`.toLowerCase();
  if (
    combined.includes('junior') ||
    combined.includes('entry') ||
    combined.includes('intern') ||
    combined.includes('graduate') ||
    combined.includes('associate') ||
    combined.includes('level 1') ||
    combined.includes('l3')
  ) {
    return 1;
  }
  if (
    combined.includes('staff') ||
    combined.includes('principal') ||
    combined.includes('architect') ||
    combined.includes('director') ||
    combined.includes('lead') ||
    combined.includes('head') ||
    combined.includes('l6') ||
    combined.includes('l7')
  ) {
    return 3;
  }
  if (
    combined.includes('senior') ||
    combined.includes('sr.') ||
    combined.includes('l5')
  ) {
    return 3;
  }
  // Mid-level / default L4
  return 2;
}

export function getDifficultyLevelLabel(difficulty: 1 | 2 | 3): {
  levelTitle: string;
  badgeColor: string;
  targetRoleHint: string;
  durationMinutes: number;
} {
  switch (difficulty) {
    case 1:
      return {
        levelTitle: 'Level 1: Junior / Foundational',
        badgeColor: 'emerald',
        targetRoleHint: 'Junior & Associate Engineers (L3)',
        durationMinutes: 15,
      };
    case 2:
      return {
        levelTitle: 'Level 2: Mid-Level Core',
        badgeColor: 'indigo',
        targetRoleHint: 'Mid-Level Software Engineers (L4)',
        durationMinutes: 30,
      };
    case 3:
      return {
        levelTitle: 'Level 3: Senior / Staff Architectural',
        badgeColor: 'purple',
        targetRoleHint: 'Senior, Staff & Principal Engineers (L5/L6+)',
        durationMinutes: 45,
      };
  }
}

export function matchSubcategory(target?: string, candidate?: string): boolean {
  if (!target || !candidate) return false;
  const canonicalTarget = canonicalizeSubcategory(target).toLowerCase();
  const canonicalCandidate = canonicalizeSubcategory(candidate).toLowerCase();
  if (canonicalTarget === canonicalCandidate) return true;

  const t = target.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (t === c) return true;
  if (t === 'system design' && (c.includes('system design') || c.includes('distributed architecture'))) return true;
  if ((t === 'data structures' || t === 'dsa') && (c.includes('data structure') || c.includes('algorithm') || c.includes('algo_ds') || c === 'dsa')) return true;
  if (t === 'leadership' && (c.includes('leadership') || c.includes('ownership'))) return true;
  if (t === 'conflict' && (c.includes('conflict') || c.includes('disagree'))) return true;
  if (t.includes('system design') && c.includes('system design')) return true;
  if (t.includes('data structure') && c.includes('data structure')) return true;
  return c.includes(t) || t.includes(c);
}

export const CATEGORY_DEFINITIONS: Record<
  QuestionCategory,
  {
    name: string;
    description: string;
    subcategories: SubcategoryMeta[];
  }
> = {
  technical: {
    name: 'Technical Excellence',
    description: 'Algorithmic efficiency, thread concurrency, memory models, network protocols, and storage internals.',
    subcategories: [
      {
        id: 'system_design',
        name: 'System Design',
        description: 'Large-scale distributed systems, partitioning, cache coherency, event streaming, and fault tolerance.',
        category: 'technical',
        primaryLiterature: 'Kleppmann: Designing Data-Intensive Applications & SOSP Raft Paper',
        aliases: ['System Design & Distributed Architecture', 'Distributed Systems'],
      },
      {
        id: 'data_structures',
        name: 'Data Structures',
        description: 'Amortized time complexities, graph traversals, dynamic programming, and space trade-offs.',
        category: 'technical',
        primaryLiterature: 'CLRS Introduction to Algorithms & Skiena Algorithm Design Manual',
        aliases: ['Algorithms & Data Structures', 'Algorithms'],
      },
      {
        id: 'concurrency',
        name: 'Concurrency & Thread Safety',
        description: 'Locks, atomic CAS operations, memory barriers, race condition prevention, and thread pools.',
        category: 'technical',
        primaryLiterature: 'Goetz: Java Concurrency in Practice & Herlihy: Art of Multiprocessor Programming',
      },
      {
        id: 'database_internals',
        name: 'Database Storage & Query Engines',
        description: 'B-Tree vs LSM-Tree write amplification, WAL crash recovery, MVCC snapshot isolation, and index selectivity.',
        category: 'technical',
        primaryLiterature: 'Kleppmann: DDIA Chapter 3 & Alex Petrov: Database Internals',
      },
      {
        id: 'network_api',
        name: 'Network Protocols & API Contracts',
        description: 'HTTP/2 multiplexing, gRPC protobuf wire encoding, TCP window starvation, and idempotency guarantees.',
        category: 'technical',
        primaryLiterature: 'RFC 9110 HTTP Semantics & Stripe Engineering Idempotency Specifications',
      },
      {
        id: 'debugging_triage',
        name: 'Production Debugging & Incident Triage',
        description: 'Flame graphs, memory leak heap profiling, cascading failure circuit breakers, and thread dump diagnosis.',
        category: 'technical',
        primaryLiterature: 'Brendan Gregg: Systems Performance & Google SRE Book Chapter 12',
      },
    ],
  },
  'system-design': {
    name: 'System Design & Distributed Architecture',
    description: 'Large-scale distributed systems, partitioning, cache coherency, event streaming, and fault tolerance.',
    subcategories: [
      {
        id: 'high_throughput',
        name: 'High-Throughput Distributed Architecture',
        description: 'Load balancing topologies, write-heavy fan-out pipelines, backpressure, and horizontal scalability.',
        category: 'system-design',
        primaryLiterature: 'Kleppmann: DDIA Ch 1 & Amazon Builders\' Library: Distributed Systems Fallacies',
      },
      {
        id: 'sharding_partitioning',
        name: 'Partitioning, Sharding & Consistent Hashing',
        description: 'Virtual nodes, partition rebalancing, hot shard mitigation, and distributed secondary indexes.',
        category: 'system-design',
        primaryLiterature: 'Amazon Dynamo SOSP Paper (DeCandia et al.) & Karger Consistent Hashing',
      },
      {
        id: 'cache_consistency',
        name: 'Cache Invalidation & Distributed Consistency',
        description: 'Write-through vs write-back, dogpiling, CAP/PACELC trade-offs, and linearizability vs sequential consistency.',
        category: 'system-design',
        primaryLiterature: 'Facebook Memcached Scaling Paper (NSDI) & Brewer CAP Theorem (IEEE 2012)',
      },
      {
        id: 'event_streaming',
        name: 'Event-Driven Streaming & Message Brokers',
        description: 'Apache Kafka partition logs, consumer group rebalancing, exactly-once semantics, and dead-letter topics.',
        category: 'system-design',
        primaryLiterature: 'Jay Kreps: The Log (LinkedIn NetDB) & Apache Kafka Architecture Specifications',
      },
      {
        id: 'fault_tolerance',
        name: 'Fault Tolerance & Disaster Recovery',
        description: 'Raft consensus quorum, split-brain protection, graceful degradation, and multi-region active-active replication.',
        category: 'system-design',
        primaryLiterature: 'Ongaro & Ousterhout: Raft Consensus (USENIX ATC) & Nygard: Release It!',
      },
      {
        id: 'observability_limits',
        name: 'Observability, Rate Limiting & SLOs',
        description: 'Token bucket vs sliding window rate limiters, distributed tracing context propagation, and P99.9 latency budgets.',
        category: 'system-design',
        primaryLiterature: 'Google Dapper Tracing Paper & Envoy Proxy Token Bucket Architecture',
      },
    ],
  },
  behavioural: {
    name: 'Behavioural & Leadership Dynamics',
    description: 'Conflict resolution, managing ambiguity, cross-functional alignment, and blameless accountability.',
    subcategories: [
      {
        id: 'leadership',
        name: 'Leadership',
        description: 'Driving architectural vision, high-agency decision making, team multipliers, and extreme ownership.',
        category: 'behavioural',
        primaryLiterature: 'Andy Grove: High Output Management & Jocko Willink: Extreme Ownership',
        aliases: ['Leadership & Ownership'],
      },
      {
        id: 'conflict',
        name: 'Conflict',
        description: 'Navigating technical disputes, balancing engineering trade-offs, and disagreeing and committing wholeheartedly.',
        category: 'behavioural',
        primaryLiterature: 'Crucial Conversations (Patterson) & Amazon Leadership Principles',
        aliases: ['Conflict Resolution & Disagreement', 'Conflict Resolution & Disagree and Commit'],
      },
      {
        id: 'ambiguity_deadlines',
        name: 'Ambiguity & Execution Velocity',
        description: 'Shipping high-stakes projects under incomplete specs, prioritizing critical paths, and pruning tech debt.',
        category: 'behavioural',
        primaryLiterature: 'Forsgren, Humble, Kim: Accelerate & Brooks: The Mythical Man-Month',
      },
      {
        id: 'cross_functional',
        name: 'Cross-Functional Leadership & Stakeholders',
        description: 'Managing product and executive expectations, negotiating technical trade-offs, and cross-team alignment.',
        category: 'behavioural',
        primaryLiterature: 'Will Larson: Staff Engineer & Peter Drucker: The Effective Executive',
      },
      {
        id: 'failure_postmortem',
        name: 'Failure, Post-Mortem & Blameless Accountability',
        description: 'Conducting transparent incident retrospectives, human-error systemic defense, and root cause mitigation.',
        category: 'behavioural',
        primaryLiterature: 'Google SRE Book Chapter 15 & John Allspaw: Etsy Blameless Post-Mortem Guide',
      },
      {
        id: 'mentorship_culture',
        name: 'Mentorship, Hiring & Engineering Culture',
        description: 'Raising the bar through structured code reviews, coaching junior engineers, and scalable onboarding.',
        category: 'behavioural',
        primaryLiterature: 'Camille Fournier: The Manager\'s Path & Laszlo Bock: Work Rules!',
      },
    ],
  },
  'company-fit': {
    name: 'Company Fit & Strategic Acumen',
    description: 'Business model unit economics, product strategy, operational values, and competitive architectural moats.',
    subcategories: [
      {
        id: 'strategic_alignment',
        name: 'Strategic Alignment & Business Model',
        description: 'Understanding monetization levers, unit economics, gross margin profiles, and business growth engines.',
        category: 'company-fit',
        primaryLiterature: 'Hamilton Helmer: 7 Powers (Foundations of Business Strategy) & Michael Porter',
      },
      {
        id: 'cultural_principles',
        name: 'Cultural Principles & Operating Tenets',
        description: 'Living organizational values, extreme ownership, bias for action, and disciplined communication.',
        category: 'company-fit',
        primaryLiterature: 'Ray Dalio: Principles & Netflix Culture Memorandum: Freedom and Responsibility',
      },
      {
        id: 'customer_focus',
        name: 'Customer Focus & Product Economics',
        description: 'Iterating on user feedback loops, customer cohort retention, and balancing feature requests against platform stability.',
        category: 'company-fit',
        primaryLiterature: 'Marty Cagan: Inspired & Eric Ries: The Lean Startup',
      },
      {
        id: 'competitive_moat',
        name: 'Competitive Landscape & Architectural Moat',
        description: 'Evaluating switching costs, proprietary technology differentiation, network effects, and ecosystem lock-in.',
        category: 'company-fit',
        primaryLiterature: 'Peter Thiel: Zero to One & Ben Thompson: Stratechery Aggregation Theory',
      },
    ],
  },
};

export const VERIFIED_EXPERT_QUESTION_BANK: Array<{
  category: QuestionCategory;
  subcategory: string;
  prompt: string;
  answer_outline: string;
  expert_answer: string;
  citations: Citation[];
  difficulty: 1 | 2 | 3;
}> = [
  // =========================================================================
  // TECHNICAL: Algorithms & Data Structures (DSA)
  // =========================================================================
  // --- LEVEL 1: Junior / Foundational Core (15m) ---
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 1,
    prompt: 'How does a Hash Table achieve O(1) average lookup time, and what occurs to time complexity and memory during hash collisions and bucket table resizing?',
    answer_outline: 'High-scoring response covers: Uniform distribution hash functions, Separate Chaining vs Open Addressing (Linear Probing / Robin Hood), load factor thresholds (0.75), amortized O(1) insertion versus worst-case O(N) rehashing, and preventing hash-flooding DOS attacks.',
    expert_answer: `Hash Table mechanics and degradation pathways:
1. Average vs Worst Case: Key hashing maps arbitrary keys to bucket indices via h(k) = hash(k) % capacity. Under uniform hashing, bucket load is bounded by load factor alpha = N/M. Average search and insert take O(1) amortized time.
2. Collision Resolution:
   - Separate Chaining: Each bucket holds a linked list or Red-Black balanced tree (e.g. Java 8+ HashMap converts buckets with >8 nodes to Red-Black trees to cap worst-case lookup at O(log N)).
   - Open Addressing: Stores elements in the primary array using probing sequences. Requires tombstone markers for deletions to maintain linear probe invariants without breaking search chains.
3. Dynamic Resizing: When N/M exceeds load factor threshold (typically 0.70 - 0.75), array capacity is doubled and all existing entries are rehashed into new buckets, taking O(N) time but amortizing to O(1) over sequence of inserts.
4. Security Invariant: Standard non-cryptographic hashes are vulnerable to hash collision denial-of-service (SipHash is used in modern runtimes like Go, Python, and Rust to randomize seed per process).`,
    citations: [
      {
        title: 'Introduction to Algorithms (CLRS, Chapter 11: Hash Tables)',
        source: 'Cormen, Leiserson, Rivest, Stein (MIT Press)',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        snippet: 'Proves load factor bounds, universal hashing families, and collision resolution trade-offs.',
      },
      {
        title: 'SipHash: A Fast Short-Input PRF',
        source: 'Jean-Philippe Aumasson & Daniel J. Bernstein (Cryptology ePrint)',
        url: 'https://131002.net/siphash/',
        snippet: 'Explains preventing algorithmic complexity attacks against hash tables in modern software.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 1,
    prompt: 'Given an unsorted array of status codes with values [0, 1, 2], how do you sort them in a single linear pass with strictly O(1) auxiliary space without using library sorting primitives?',
    answer_outline: 'High-scoring response covers: Dijkstra\'s Dutch National Flag three-way partitioning algorithm, maintaining low, mid, and high pointer invariants in a single pass O(N) time and O(1) space.',
    expert_answer: `Dijkstra Dutch National Flag 3-Way Partitioning:
1. Pointer Invariants: Maintain three pointers across array A:
   - low: boundary where all indices < low hold 0.
   - mid: current examination pointer where low <= mid <= high.
   - high: boundary where all indices > high hold 2.
2. Single-Pass Execution Loop (while mid <= high):
   - If A[mid] === 0: swap(A[low], A[mid]), increment low++, increment mid++.
   - If A[mid] === 1: simply advance mid++.
   - If A[mid] === 2: swap(A[mid], A[high]), decrement high-- (do not increment mid because swapped element at mid must be re-evaluated).
3. Complexity & Bounds: Time complexity is strictly O(N) because mid or high moves in every single iteration (at most N steps). Auxiliary space is strictly O(1) in-place without recursion stack allocations.`,
    citations: [
      {
        title: 'A Discipline of Programming (Dutch National Flag Problem)',
        source: 'Edsger W. Dijkstra (Prentice Hall)',
        url: 'https://www.cs.utexas.edu/users/EWD/',
        snippet: 'The foundational formal derivation of three-way array partitioning invariants.',
      },
      {
        title: 'The Algorithm Design Manual (Sorting and Searching)',
        source: 'Steven S. Skiena (Springer, Chapter 4)',
        url: 'https://www.algorist.com/',
        snippet: 'Explains linear partitioning, quicksort pivot mechanics, and memory locality.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 1,
    prompt: 'When traversing hierarchical node graphs (such as an organizational hierarchy or DOM tree), when would you choose Breadth-First Search (BFS) over Depth-First Search (DFS), and what are their respective auxiliary space complexities?',
    answer_outline: 'High-scoring response covers: BFS using FIFO Queue vs DFS using Call Stack / LIFO Stack. BFS space O(W) where W is maximum tree width; DFS space O(H) where H is tree height (O(log N) balanced, O(N) degenerate).',
    expert_answer: `Comparative Analysis of BFS vs DFS:
1. Traversal Strategy & Data Structures:
   - BFS explores level-by-level using an explicit FIFO Queue. Optimal for shortest-path unweighted graph queries and finding closest target nodes.
   - DFS explores to leaf depth using LIFO Call Stack or explicit Stack. Optimal for topological sorting, cycle detection, and memory-constrained deep trees.
2. Space Complexity Bounds:
   - BFS auxiliary space is O(W) where W is tree width. In a balanced binary tree, the leaf level contains N/2 nodes, requiring O(N) RAM.
   - DFS auxiliary space is O(H) where H is tree height. In a balanced tree H = O(log N). In a degenerate skewed linked-list tree H = O(N).
3. Production Hazard: Recursive DFS without tail-call optimization risks call stack overflow on deep paths (>10,000 depth); production engines use iterative DFS with explicit heap-allocated stacks or Morris Traversal for O(1) space.`,
    citations: [
      {
        title: 'Algorithms (4th Edition, Chapter 4: Graphs)',
        source: 'Robert Sedgewick & Kevin Wayne (Addison-Wesley)',
        url: 'https://algs4.cs.princeton.edu/',
        snippet: 'Detailed breakdown of queue-based BFS frontier expansion versus stack-based DFS recursion.',
      },
      {
        title: 'Introduction to Algorithms (CLRS Chapter 22: Graph Traversals)',
        source: 'Cormen et al. (MIT Press)',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        snippet: 'Formal correctness proofs for breadth-first discovery times and shortest-path trees.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 1,
    prompt: 'How does a Monotonic Stack solve the "Next Greater Element" problem across an array of telemetry readings in linear O(N) time instead of naive O(N^2) brute force?',
    answer_outline: 'High-scoring response covers: Decreasing monotonic stack invariant, storing array indices, popping smaller elements when a larger value arrives, each index pushed and popped at most once (2N operations max).',
    expert_answer: `Monotonic Stack mechanics and invariant preservation:
1. Invariant: Maintain a stack of array indices where the values corresponding to indices in the stack are kept in strictly monotonic decreasing order.
2. Traversal Loop: Iterate through array from index 0 to N-1:
   - While stack is non-empty and A[i] > A[stack.peek()]: the next greater element for index stack.pop() is confirmed to be A[i]. Record result for that popped index.
   - Push current index i onto stack.
3. Amortized Analysis: Although nested loops exist, each index is pushed onto the stack exactly once and popped at most once across the entire algorithm execution. Total operations <= 2N, establishing strict O(N) time complexity.
4. Memory Footprint: Auxiliary space is O(N) in the worst case (strictly decreasing input array where no elements pop until EOF).`,
    citations: [
      {
        title: 'Introduction to Algorithms (CLRS Section 10.1: Elementary Data Structures)',
        source: 'Cormen, Leiserson, Rivest, Stein (MIT Press)',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        snippet: 'Explains stack invariants, push/pop mechanics, and amortized sequence analysis.',
      },
      {
        title: 'Competitive Programmer\'s Handbook (Chapter 8: Amortized Analysis)',
        source: 'Antti Laaksonen (CSES)',
        url: 'https://cses.fi/book/book.pdf',
        snippet: 'Formal proof of 2N push/pop bounds in monotonic stack algorithms.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 1,
    prompt: 'Explain Floyd\'s Cycle-Finding Algorithm (Tortoise and Hare). How does it detect a cycle in a singly linked list in O(1) auxiliary space, and how do you locate the exact cycle entry node mathematically?',
    answer_outline: 'High-scoring response covers: Fast and slow pointers (1 step vs 2 steps), relative speed 1 guarantees intersection in loop, mathematical derivation showing distance from head to entry node equals distance from intersection point to entry node modulo cycle length.',
    expert_answer: `Floyd Tortoise and Hare Cycle Detection & Entrance Proof:
1. Cycle Detection: Initialize slow and fast pointers at list head. In each step, slow advances 1 node, fast advances 2 nodes. If fast or fast.next is null, no cycle exists. Because relative speed difference is 1 node per iteration, if a cycle of length C exists, fast gains 1 step per tick and must collide with slow in <= C iterations.
2. Mathematical Derivation for Entry Node:
   - Let F = distance from head to cycle entrance.
   - Let C = length of cycle.
   - Let a = distance from cycle entrance to collision point.
   - Total distance slow traveled: d_slow = F + a.
   - Total distance fast traveled: d_fast = F + k*C + a (for some integer k >= 1).
   - Since fast moves at 2x speed: 2*(F + a) = F + k*C + a  =>  F + a = k*C  =>  F = k*C - a.
3. Locating Entrance: Keep fast at collision point and reset slow to head. Advance both pointers at speed 1. After F steps, slow arrives at the cycle entrance, and fast (starting at a and moving F = k*C - a steps) also lands exactly at the cycle entrance.`,
    citations: [
      {
        title: 'Non-deterministic Algorithms (Algorithm 97: Shortest Path)',
        source: 'Robert W. Floyd (Communications of the ACM)',
        url: 'https://doi.org/10.1145/368273.368554',
        snippet: 'Original mathematical formulation of cycle detection via pointer step differentials.',
      },
      {
        title: 'The Art of Computer Programming (Vol 2: Seminumerical Algorithms)',
        source: 'Donald E. Knuth (Addison-Wesley, Section 3.1)',
        url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
        snippet: 'Detailed analysis of pseudo-random number cycles and tortoise-hare collision bounds.',
      },
    ],
  },

  // --- LEVEL 2: Mid-Level Core (30m) ---
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'Given an infinite streaming window of numeric telemetry points, how do you compute the 99th percentile (P99) latency in real-time with bounded O(1) memory and O(1) update time?',
    answer_outline: 'High-scoring response covers: t-Digest and HdrHistogram data structures, logarithmic dynamic binning, compression of streaming data, and accuracy guarantees under non-normal distributions.',
    expert_answer: `Real-time percentile computation over unbounded streams cannot retain all samples in memory:
1. HdrHistogram (High Dynamic Range Histogram): Uses a fixed-size integer array partitioned into logarithmic sub-buckets. Maintains precision across 5 significant decimal digits across values from 1 microsecond to 1 hour with zero allocation during recording.
2. t-Digest Algorithm: Uses adaptive clustering of sample centroids where centroids are spaced closer near extreme tails (P99, P99.9), providing <0.1% relative error at extreme percentiles.
3. Mergeability: Percentile sketches are commutative and associative; worker nodes compute local histograms and merge them via simple vector addition at the aggregation gateway with zero precision degradation.`,
    citations: [
      {
        title: 'Computing Extremely Accurate Quantiles Using t-Digests',
        source: 'Ted Dunning & Otmar Ertl (arXiv:1902.04023)',
        url: 'https://arxiv.org/abs/1902.04023',
        snippet: 'Defines centroid clustering and proofs of bound error rates on streaming quantile estimations.',
      },
      {
        title: 'HdrHistogram: A High Dynamic Range Histogram',
        source: 'Gil Tene (Azul Systems Whitepaper)',
        url: 'https://hdrhistogram.org/',
        snippet: 'Explains zero-allocation latency recording and mitigating coordinated omission.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'Given a complex microservice dependency graph with potential cycles, how do you determine a valid sequential build/deployment order using Kahn\'s Algorithm vs DFS 3-Coloring, and how do you surface the exact deadlock cycle?',
    answer_outline: 'High-scoring response covers: Directed Acyclic Graph (DAG) topological sort, Kahn\'s Algorithm using in-degree array and zero-in-degree queue, 3-color DFS (WHITE/GRAY/BLACK) for cycle back-edge detection, cycle path reconstruction.',
    expert_answer: `Topological Sorting & Cycle Diagnosis:
1. Directed Acyclic Graph (DAG) Modeling: Nodes represent services/tasks, directed edges represent dependencies (A -> B means A must execute before B).
2. Kahn\'s Algorithm (BFS-based):
   - Compute in-degree (number of incoming dependencies) for each node.
   - Enqueue all nodes with in-degree 0 into a processing FIFO Queue.
   - While queue is not empty: dequeue node u, append u to sorted order. For each outgoing neighbor v of u: decrement in-degree[v]. If in-degree[v] becomes 0, enqueue v.
   - Cycle Detection: If count of processed nodes < total vertices V, the graph contains at least one directed cycle.
3. 3-Color DFS for Exact Cycle Attribution:
   - State 0 (WHITE): unvisited. State 1 (GRAY): actively in recursion call stack. State 2 (BLACK): fully explored.
   - If DFS encounters a GRAY node, a back-edge is identified. Backtrack recursion stack to extract and print the exact circular dependency cycle (e.g. Auth -> Billing -> Cache -> Auth).
4. Time Complexity: O(V + E) time, O(V + E) memory for adjacency list and degree tracking.`,
    citations: [
      {
        title: 'Topological Sorting of Large Networks (Communications of the ACM)',
        source: 'A. B. Kahn (ACM 1962)',
        url: 'https://doi.org/10.1145/368996.369025',
        snippet: 'The foundational publication defining zero-in-degree queue topological sorting.',
      },
      {
        title: 'Depth-First Search and Linear Graph Algorithms (SIAM Journal on Computing)',
        source: 'Robert Tarjan (SIAM 1972)',
        url: 'https://doi.org/10.1137/0201010',
        snippet: 'Defines 3-color recursion trees and back-edge cycle detection proofs.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'How do you merge K sorted database transaction log streams containing billions of total records into a single globally ordered stream using strictly bounded memory?',
    answer_outline: 'High-scoring response covers: Min-Heap / Priority Queue of size K storing the top element and stream iterator from each stream, O(log K) extraction per element, O(N log K) total time, strictly O(K) memory.',
    expert_answer: `Streaming K-Way Merge with Priority Queue:
1. Memory Invariant: Billions of records cannot be materialized in RAM. Instead, open an active streaming cursor / iterator for each of the K partitioned log files.
2. Min-Heap Initialization: Insert the first record from each of the K streams into a Min-Heap of fixed capacity K. Each heap node contains: { timestamp, recordData, streamIndex }. Initialization takes O(K log K) time.
3. Extraction Loop:
   - While heap is non-empty: pop root element (globally smallest timestamp).
   - Emit root record directly to downstream consumer or output pipe.
   - Read the next record from the stream identified by streamIndex. If stream has more records, insert new record into heap (O(log K)). If stream reached EOF, heap size shrinks by 1.
4. Complexity: Total time complexity is strictly O(N log K) where N is total records across all streams. Auxiliary space is strictly O(K) in-memory regardless of whether N is 1 million or 10 billion.`,
    citations: [
      {
        title: 'The Art of Computer Programming (Vol 3: Sorting and Searching)',
        source: 'Donald E. Knuth (Addison-Wesley, Section 5.4: Multiway Merging)',
        url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
        snippet: 'Proves replacement-selection tournament trees and priority queues for external sorting.',
      },
      {
        title: 'Introduction to Algorithms (CLRS Section 6.5: Priority Queues)',
        source: 'Cormen et al. (MIT Press)',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        snippet: 'Array-based binary heap invariants, swim/sink mechanics, and cache locality.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'Explain the algorithmic transition from recursive memoization (Top-Down) to iterative tabulation (Bottom-Up) with state space compression in Dynamic Programming for Coin Change or Knapsack. How do you reduce memory from O(N * W) to O(W)?',
    answer_outline: 'High-scoring response covers: Optimal substructure and overlapping subproblems, memoization call-stack overhead, bottom-up 2D table dp[i][w], recognizing dependency on only previous row (i-1), compressing to single 1D array traversed in reverse direction.',
    expert_answer: `Dynamic Programming State Space Reduction:
1. Problem Structure: Given target weight/amount W and N items with values/weights, optimal state at step i depends strictly on choices made at step i-1: dp[i][w] = min(dp[i-1][w], dp[i-1][w - cost[i]] + 1).
2. 2D Tabulation: Materializing full table dp[N][W] consumes O(N * W) space, which for N=10,000 and W=50,000 consumes gigabytes of RAM and triggers CPU cache misses.
3. State Space Compression:
   - Notice that calculating row i only requires values from row i-1; older rows (0 to i-2) are never read again.
   - Maintain a single 1D array dp[w] of size W + 1.
   - For 0/1 Knapsack (single use per item): iterate w backwards from W down to cost[i]. Backward traversal guarantees that dp[w - cost[i]] represents the value from row i-1 before item i was considered, preventing accidental unbounded re-use.
   - For Unbounded Coin Change (infinite supply): iterate w forwards from cost[i] to W.
4. Performance Gain: Auxiliary memory drops from O(N * W) to strictly O(W), fitting entirely into L2/L3 CPU cache lines for a 10x throughput boost.`,
    citations: [
      {
        title: 'Dynamic Programming',
        source: 'Richard Bellman (Princeton University Press)',
        url: 'https://press.princeton.edu/books/paperback/9780691146683/dynamic-programming',
        snippet: 'The foundational monograph introducing the Principle of Optimality and state transitions.',
      },
      {
        title: 'Algorithm Design (Chapter 6: Dynamic Programming)',
        source: 'Jon Kleinberg & Éva Tardos (Pearson)',
        url: 'https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003504',
        snippet: 'Covers subproblem DAGs, topological ordering of iterations, and space compression.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'How does a Trie (Prefix Tree) enable sub-millisecond autocomplete and prefix search across millions of strings, and how do you optimize its memory footprint over naive 26-pointer node arrays?',
    answer_outline: 'High-scoring response covers: Tree structure where edge paths encode characters, O(L) lookup time where L is prefix length independent of dataset size N, memory optimization via Radix / Patricia compression, Ternary Search Trees (TST), and heap caching at nodes for instant top-K ranking.',
    expert_answer: `Trie Data Structure & Memory Engineering:
1. Lookup Complexity: Each node represents a character; words are paths from root to terminal nodes. Prefix matching takes O(L) time where L is query length, regardless of whether the dictionary contains 10,000 or 100,000,000 words.
2. Naive Memory Bottleneck: Allocating an array of 26 child pointers (or 256 for ASCII) per node results in 95% null pointer overhead. A million words with 8-byte pointers can consume >500MB RAM.
3. Memory Optimization Patterns:
   - Radix / Compressed Trie (Patricia Tree): Collapse non-branching node chains into single string edges (e.g. root -> "inter" -> "view" instead of 9 individual single-character nodes), reducing node allocations by up to 70%.
   - Ternary Search Tree (TST): Each node holds a split character with exactly 3 pointers (left <, mid =, right >), balancing logarithmic branching with minimal memory overhead.
   - Top-K Frequency Caching: Store a precomputed Min-Heap of top 5 completion IDs at each internal node. Autocomplete queries return instant results in O(L) without needing an exhaustive subtree DFS at query time.`,
    citations: [
      {
        title: 'Trie Memory (Communications of the ACM)',
        source: 'Edward Fredkin (CACM 1960)',
        url: 'https://doi.org/10.1145/367390.367400',
        snippet: 'The original paper introducing trie retrieval algorithms and character path trees.',
      },
      {
        title: 'Algorithms in C (Part 5: String Searching & Tries)',
        source: 'Robert Sedgewick (Addison-Wesley)',
        url: 'https://algs4.cs.princeton.edu/52trie/',
        snippet: 'Detailed comparison of R-way tries, Patricia trees, and ternary search trees.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 2,
    prompt: 'How does Disjoint Set Union (Union-Find) achieve near O(1) amortized time for dynamic graph connectivity, and how do Path Compression and Union by Rank ensure the Inverse Ackermann bound?',
    answer_outline: 'High-scoring response covers: Disjoint sets represented as inverted trees, Find operation with Path Compression flattening tree, Union operation with Rank/Size heuristics attaching smaller tree to root of larger tree, amortized time O(alpha(N)) where alpha is Inverse Ackermann (< 5 for all practical universe sizes).',
    expert_answer: `Disjoint Set Union (DSU) Algorithmic Mechanics:
1. Core Representation: An integer array parent[] where parent[i] points to the representative root of element i\'s set.
2. Two Crucial Invariant Heuristics:
   - Union by Rank / Size: Maintain rank[] array indicating upper bound on tree height. When uniting set A and set B, always attach the root with smaller rank under the root with larger rank. If ranks are equal, increment resulting root rank by 1. Prevents tree degeneration into O(N) linked list.
   - Path Compression: During find(x), recursively update parent[x] = find(parent[x]). Every node visited along the traversal path points directly to the set representative root.
3. Amortized Time Complexity:
   - Without heuristics: worst case is O(N) per find.
   - With Union by Rank alone: worst case is O(log N).
   - With BOTH Path Compression and Union by Rank: sequence of M operations on N elements takes O(M * alpha(N)) where alpha is the Inverse Ackermann function. Because alpha(10^80) <= 4, operations run in effective O(1) time.
4. Primary Production Applications: Kruskal\'s Minimum Spanning Tree (MST), network cluster connectivity, cycle detection in undirected graphs, and distributed microservice mesh partitioning.`,
    citations: [
      {
        title: 'Efficiency of a Good But Not Linear Set Union Algorithm (Journal of the ACM)',
        source: 'Robert Tarjan (JACM 1975)',
        url: 'https://doi.org/10.1145/321879.321884',
        snippet: 'The mathematical proof establishing the Inverse Ackermann bound for DSU.',
      },
      {
        title: 'Introduction to Algorithms (CLRS Chapter 21: Data Structures for Disjoint Sets)',
        source: 'Cormen, Leiserson, Rivest, Stein (MIT Press)',
        url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
        snippet: 'Covers linked-list representation, tree representation, rank heuristics, and amortized bounds.',
      },
    ],
  },

  // --- LEVEL 3: Senior / Staff / Architectural (45m) ---
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'How would you design a thread-safe, lock-free LRU Cache that achieves O(1) reads and writes while preventing lock contention under extreme parallel load?',
    answer_outline: 'High-scoring response covers: Concurrent SkipList / Sharded Hash Tables with eviction rings, avoiding global mutex bottlenecks, Compare-And-Swap (CAS) on atomic node pointers, and handling concurrent read-during-eviction races.',
    expert_answer: `To eliminate mutex contention in an LRU cache under massive concurrency:
1. Sharded Hash Map Partitioning: Rather than a single global lock, shard the keyspace across 64 or 128 independent buckets using MurmurHash3 to spread lock contention across CPU cache lines.
2. Read Path Optimization (Lock-Free Hit Recording): Avoid mutating doubly-linked lists on every read. Instead, append hit events to a per-thread ring buffer (or Stripe buffer) and batch-drain them into the eviction queue asynchronously via a background cleaner or during write phases.
3. Eviction Policy Invariant: Use a Clock-Pro or 2Q eviction algorithm with atomic generation counters instead of naive doubly-linked list node splicing, preventing pointer corruption during concurrent CAS operations.
4. Memory Barrier Enforcement: Use Acquire-Release memory semantics to guarantee that when a node\'s data is updated, subsequent reader threads observing the pointer immediately perceive all initialized payload fields.`,
    citations: [
      {
        title: 'Designing Data-Intensive Applications (Storage and Retrieval)',
        source: 'Martin Kleppmann (O\'Reilly Media, Chapter 3)',
        url: 'https://dataintensive.net/',
        snippet: 'Explains hash-index eviction mechanics, append-only segment compaction, and memory index trade-offs.',
      },
      {
        title: 'Caffeine Cache: High Performance, Near Optimal Caching for Java',
        source: 'Ben Manes & Cassandra Developers (GitHub / USENIX)',
        url: 'https://github.com/ben-manes/caffeine',
        snippet: 'Demonstrates Window TinyLFU, ring-buffer read recording, and eliminating lock contention in concurrent caches.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'Compare the algorithmic and hardware trade-offs between B+ Trees and Log-Structured Merge (LSM) Trees under high-write workloads. How do SkipLists, SSTables, and Bloom filters prevent read degradation in LSM storage engines?',
    answer_outline: 'High-scoring response covers: B+ tree random in-place updates vs LSM append-only sequential writes, Write Amplification Factor (WAF), MemTable (ConcurrentSkipListMap), write-ahead log (WAL), leveled compaction, Bloom filter bit vectors avoiding unnecessary disk seeks.',
    expert_answer: `Algorithmic & Storage Engine Trade-Offs (B+ Tree vs LSM-Tree):
1. In-Place Updates vs Append-Only Writes:
   - B+ Trees write directly to disk pages (typically 4KB-16KB). Updating a single 100-byte record requires rewriting an entire page, causing high Write Amplification (WAF 10-30x) and random I/O that degrades flash SSD endurance.
   - LSM-Trees write mutations sequentially to an in-memory MemTable (backed by an append-only WAL for crash recovery). Writes achieve O(1) sequential I/O speed.
2. MemTable & SSTable Flush Mechanics:
   - The MemTable is commonly implemented via a lock-free ConcurrentSkipListMap providing concurrent O(log N) inserts and range queries.
   - When MemTable reaches size threshold (e.g. 64MB), it is converted to an immutable MemTable and flushed to Level 0 as a Sorted String Table (SSTable) file containing ordered key-value blocks and block index footers.
3. Read Path Mitigation (Bloom Filters & Compaction):
   - Reading an arbitrary key in an LSM-tree risks reading across multiple SSTable levels (Read Amplification).
   - Solution: Every SSTable maintains an in-memory Bloom Filter bit vector. If bloom.contains(key) returns false, the disk read is skipped entirely with 0 I/O.
   - Leveled Compaction merges sorted SSTable runs across levels (Level N to Level N+1), removing overwritten versions and deleted tombstones to bound disk usage.`,
    citations: [
      {
        title: 'The Log-Structured Merge-Tree (LSM-Tree)',
        source: 'Patrick O\'Neil, Edward O\'Neil, Gerhard Weikum (Acta Informatica 1996)',
        url: 'https://doi.org/10.1007/s002360050048',
        snippet: 'The foundational paper detailing append-only log trees, rolling merges, and eliminating random disk head seeks.',
      },
      {
        title: 'Database Internals: A Deep Dive into How Distributed Data Systems Work',
        source: 'Alex Petrov (O\'Reilly Media, Chapter 7)',
        url: 'https://www.databass.dev/',
        snippet: 'Detailed breakdown of B+ Trees, SSTables, Write-Ahead Logs, and Leveled Compaction strategies.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'In a distributed caching cluster of 500 nodes, how does Consistent Hashing minimize key redistribution during node additions/failures, and how do Virtual Nodes prevent hot-spot skew under non-uniform key distributions?',
    answer_outline: 'High-scoring response covers: Circular hash ring [0, 2^32 - 1], mapping keys and nodes onto ring, reassignment of only K/N keys during membership change instead of K keys in modulo hashing, Virtual Nodes (vnodes) distributing variance according to Central Limit Theorem, bounded load consistent hashing.',
    expert_answer: `Consistent Hashing & Ring Distribution Architecture:
1. The Problem with Modulo Hashing: Naive hash(key) % N redistributes nearly 100% of keys whenever N changes (cache stampede).
2. The Consistent Hash Ring:
   - Both nodes and keys are hashed into a continuous identifier ring space [0, 2^32 - 1].
   - A key is assigned to the first node encountered by walking clockwise around the ring.
   - When a node is added or removed, only keys residing in the segment between the affected node and its immediate predecessor are migrated (average K/N keys moved, where K is total keys and N is node count).
3. Virtual Nodes (VNodes) for Skew Mitigation:
   - Physical servers have non-uniform token positions, creating severe variance where one server might receive 300% more traffic than average.
   - VNodes map each physical server to V distinct virtual points on the ring (e.g. V = 256 virtual tokens per node).
   - By the Central Limit Theorem, token dispersion becomes exponentially uniform; standard deviation of key ownership drops to sigma = O(1 / sqrt(V)), eliminating hot-spot imbalances.
4. Bounded-Load Consistent Hashing: Caps each node at (1 + epsilon) * (average load). If a node reaches capacity, keys spill over to the next clockwise node, guaranteeing zero cascading node collapse.`,
    citations: [
      {
        title: 'Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web',
        source: 'David Karger et al. (STOC 1997 / ACM)',
        url: 'https://doi.org/10.1145/258533.258660',
        snippet: 'The landmark paper that introduced consistent hashing rings to eliminate cache stampedes.',
      },
      {
        title: 'Consistent Hashing with Bounded Loads',
        source: 'Vahab Mirrokni, Mikkel Thorup, Morteza Zadimoghaddam (ACM Symposium on Theory of Computing)',
        url: 'https://arxiv.org/abs/1608.08738',
        snippet: 'Proves mathematical upper bounds preventing cascading server overloads on consistent hashing rings.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'When testing whether high-volume telemetry events have been seen or counting unique users across billions of sessions, why are Bloom Filters and HyperLogLog preferred over Hash Sets, and how do you calculate optimal bit array size and hash functions for a target false-positive rate?',
    answer_outline: 'High-scoring response covers: Bloom Filter space-bounded probabilistic membership (zero false negatives, controlled false positives), optimal bit size m = -(n * ln p) / (ln 2)^2, optimal hash count k = (m/n) * ln 2, HyperLogLog cardinality estimation in 1.5KB RAM using leading-zero register bucketing and harmonic mean.',
    expert_answer: `Probabilistic Space-Bounded Data Structures:
1. Bloom Filter Mathematical Optimization:
   - Given n expected elements and target false positive rate p (e.g. p = 0.01 for 1% error):
   - Optimal bit array size: m = -(n * ln(p)) / (ln 2)^2 approx 9.6 bits per element for 1% error.
   - Optimal independent hash count: k = (m / n) * ln(2) approx 7 hash functions.
   - Query operation: computes k hashes; if ANY bit is 0, item is definitively NOT present (0 false negatives). If all k bits are 1, item is PROBABLY present.
2. HyperLogLog (HLL) Cardinality Estimation:
   - Storing 1 billion 64-bit user IDs in a standard hash set requires >8 GB of RAM.
   - HLL hashes incoming elements and uses the first b bits to select one of m = 2^b registers (e.g. b=12 gives m=4096 registers).
   - In each register, record maximum count of consecutive leading zeros observed in remaining hash bits.
   - Calculate cardinality using the Harmonic Mean across all 4096 registers multiplied by alpha bias correction factor.
   - Result: Standard error is bounded by 1.04 / sqrt(m) approx 1.6% error while consuming only 1.5 KB of memory regardless of whether cardinality is 1,000 or 10,000,000,000!`,
    citations: [
      {
        title: 'Space/Time Trade-offs in Hash Coding with Allowable Errors',
        source: 'Burton H. Bloom (Communications of the ACM 1970)',
        url: 'https://doi.org/10.1145/362686.362692',
        snippet: 'The original mathematical foundation of space-bounded bloom filter error rates.',
      },
      {
        title: 'HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm',
        source: 'Philippe Flajolet, Éric Fusy, Olivier Gandouet, Frédéric Meunier (DMTCS 2007)',
        url: 'https://hal.archives-ouvertes.fr/hal-00406166/',
        snippet: 'Rigorous proof of harmonic mean cardinality estimation with bounded 1.5KB register arrays.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'How does the LMAX Disruptor pattern achieve millions of messages per second with sub-microsecond latency without using standard OS mutexes or blocking queue data structures?',
    answer_outline: 'High-scoring response covers: Pre-allocated circular ring buffer of size 2^P, bitwise sequence masking (seq & (size - 1)), single-producer/multi-consumer sequence barriers, cache-line padding (64 bytes) to eliminate False Sharing on L1/L2 caches, mechanical sympathy with CPU instruction prefetching.',
    expert_answer: `Mechanical Sympathy & Lock-Free Ring Buffers (LMAX Disruptor):
1. Bottlenecks of Blocking Queues: Standard blocking queues (e.g. ArrayBlockingQueue) use ReentrantLock and Condition variables. Under high throughput, CPU threads suffer lock contention, context switching penalties (~1-3 microseconds per switch), and severe cache line invalidations.
2. The Disruptor Ring Buffer Architecture:
   - A single contiguous array pre-allocated at startup with size = 2^P (power of two), allowing index lookup via bitwise AND: index = sequence & (bufferSize - 1) without integer division.
   - Pre-allocation eliminates runtime GC garbage collection pauses and object allocation churn entirely.
3. Sequence Barriers & Memory Ordering:
   - Producers and Consumers each own independent 64-bit sequence counters. Consumers track producer progress via Sequence Barriers using Acquire memory semantics without modifying producer state.
4. Eliminating False Sharing via Cache Line Padding:
   - Modern CPUs load memory in 64-byte cache lines. If producer and consumer sequence counters reside on the same 64-byte line, core 1 writing to producer sequence invalidates core 2\'s L1 cache line (False Sharing / MESI cache line bouncing).
   - Solution: Pad sequence numbers with 7 dummy 64-bit longs (56 bytes + 8 bytes = 64 bytes), guaranteeing each counter occupies a dedicated CPU cache line.`,
    citations: [
      {
        title: 'Disruptor: High Performance Alternative to Bounded Queues for Exchanging Data Between Concurrent Threads',
        source: 'Martin Thompson, Dave Farley, Michael Barker, Patricia Gee, Stewart Allen (LMAX Whitepaper)',
        url: 'https://lmax-exchange.github.io/disruptor/',
        snippet: 'Explains lock-free ring buffers, cache-line padding, and eliminating OS futex contention.',
      },
      {
        title: 'The Art of Multiprocessor Programming (Chapter 10: Memory Models & Synchronization)',
        source: 'Maurice Herlihy & Nir Shavit (Morgan Kaufmann)',
        url: 'https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-370591-4',
        snippet: 'Rigorous analysis of hardware cache coherence protocols and memory barriers.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'How do you design an in-memory spatial index to query all active drivers within a 3km radius of a passenger in real-time under high-velocity location update streams?',
    answer_outline: 'High-scoring response covers: QuadTree vs Geohash / Uber H3 hexagonal hierarchical index, Morton Z-order curve mapping 2D coordinates to 1D integer keys, bounding box range queries, dynamic in-memory location updates vs persistent spatial indexing.',
    expert_answer: `Real-Time Spatial Indexing Architecture:
1. Failure of Traditional B-Trees: Querying 2D spatial points via WHERE lat BETWEEN x1 AND x2 AND lng BETWEEN y1 AND y2 forces a database into an index scan on latitude followed by an expensive filtering pass across all matching longitude points (O(N) search space).
2. Space-Filling Curves & Hierarchical Discretization:
   - Morton Z-Order / Hilbert Curve: Interleave the binary bits of latitude and longitude coordinates into a single 64-bit integer. Nearby geographic coordinates map to nearby integers, converting 2D spatial proximity into 1D B-Tree range scans.
   - Uber H3 Hexagonal Grid: Partitions Earth into hierarchical hexagonal cells. Hexagons have the unique property that all 6 neighbors share identical centroid distances (unlike squares where diagonals are sqrt(2) times further).
3. Dynamic QuadTree Partitioning:
   - Each internal node splits space into 4 quadrants (NW, NE, SW, SE). When a quadrant exceeds threshold (e.g. 50 drivers), it subdivides recursively.
   - Proximity Search: Test bounding box circle against node bounds; prune non-intersecting quadrants immediately, executing in O(log_4 N) time.
4. High-Throughput Location Updates:
   - Moving vehicles send GPS coordinates every 3-5 seconds. Instead of rebuilding trees on every update, use a two-tiered architecture: an atomic ConcurrentHashMap<DriverID, H3Index> for instant point writes, combined with local ring cell subscriber lists.`,
    citations: [
      {
        title: 'Foundations of Multidimensional and Metric Data Structures',
        source: 'Hanan Samet (Morgan Kaufmann)',
        url: 'https://www.elsevier.com/books/foundations-of-multidimensional-and-metric-data-structures/samet/978-0-12-369446-1',
        snippet: 'The definitive textbook on QuadTrees, R-Trees, k-d Trees, and spatial range queries.',
      },
      {
        title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index',
        source: 'Isaac Brodsky & Uber Engineering Blog',
        url: 'https://www.uber.com/blog/h3/',
        snippet: 'Explains hexagonal cell indexing, resolution hierarchies, and sub-millisecond neighbor lookups.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Algorithms & Data Structures',
    difficulty: 3,
    prompt: 'How do Persistent (Immutable) Data Structures via Structural Sharing support atomic snapshots, branching, and historical rollbacks without copying the entire dataset on every write?',
    answer_outline: 'High-scoring response covers: Structural sharing, Path Copying in trees where only nodes from root to modified leaf are recreated while unmodified subtrees are referenced by both versions, 32-way Bitmapped Vector Tries, O(log N) immutable updates with O(1) snapshots.',
    expert_answer: `Persistent Data Structures & Structural Sharing:
1. Persistent vs Ephemeral: An ephemeral data structure destroys the previous version upon modification. A persistent data structure preserves all previous versions, allowing time-travel queries, lock-free concurrency, and instant branching (as in Git or Clojure).
2. Path Copying Mechanics:
   - When modifying an element at a leaf node in a balanced tree of depth D = log N, you do NOT copy the entire tree.
   - Only the leaf node and its direct ancestors up to the root (exactly D nodes) are cloned with the updated pointers.
   - All other unmodified subtrees are shared by reference between the old version root and the new version root.
3. Bitmapped Vector Trie (Rich Hickey Architecture):
   - Uses a 32-way branching tree where each tree level consumes 5 bits of the integer index (2^5 = 32).
   - In a 32-bit integer keyspace, tree depth is capped at 7 levels (32^7 > 34 billion elements).
   - Any update creates at most 7 small 32-pointer nodes, making updates take O(log_32 N) <= 7 steps, which behaves as effective O(1) memory and time.
4. Concurrency Advantage: Readers access immutable snapshot roots without locks or mutexes; writers atomically swap the root pointer via atomic CAS, achieving total isolation without read-write deadlocks.`,
    citations: [
      {
        title: 'Purely Functional Data Structures',
        source: 'Chris Okasaki (Cambridge University Press)',
        url: 'https://www.cs.cmu.edu/~rwh/theses/okasaki.pdf',
        snippet: 'The seminal academic treatise defining lazy evaluation, path copying, and finger trees.',
      },
      {
        title: 'Ideal Hash Trees',
        source: 'Phil Bagwell (Technical Report, EPFL)',
        url: 'https://lampwww.epfl.ch/papers/idealhashtrees.pdf',
        snippet: 'Defines Hash Array Mapped Tries (HAMT) and 32-way bitmapped persistent vectors.',
      },
    ],
  },

  // =========================================================================
  // TECHNICAL: Concurrency & Thread Safety
  // =========================================================================
  {
    category: 'technical',
    subcategory: 'Concurrency & Thread Safety',
    difficulty: 3,
    prompt: 'Explain the difference between Compare-And-Swap (CAS) and Mutexes in high-contention scenarios. What is the ABA problem in lock-free algorithms, and how is it solved at the hardware and runtime level?',
    answer_outline: 'High-scoring response covers: Hardware primitive CMPXCHG, busy-waiting vs kernel context switching, ABA hazard where a memory address is recycled, and solutions using tagged pointers / double-word CAS (CMPXCHG16B) or Hazard Pointers.',
    expert_answer: `1. CAS vs Mutex Under Contention: Mutexes put competing threads to sleep via OS futex calls, incurring context switch penalties (~1.5–3 microseconds). CAS uses hardware atomic instructions (CMPXCHG on x86) in user space. Under mild contention, CAS is 10x faster; under severe contention, CAS threads experience livelock and cache-coherence bus storms (MESI invalidation traffic).
2. The ABA Problem: Thread 1 reads value A from memory address X. Thread 2 interrupts, changes X to B, frees memory, and allocates new data at address X with value A. Thread 1 resumes, executes CAS(X, A, C), and succeeds erroneously because the semantic state of the data changed even though the pointer remained identical.
3. Proven Mitigations:
   - Versioned/Tagged Pointers: Pack an incrementing 64-bit integer timestamp alongside the pointer and execute Double-Width CAS (e.g. CMPXCHG16B in x86-64).
   - Hazard Pointers & Epoch-Based Reclamation: Defer memory reclamation until all concurrent readers announce they have surrendered their local references.`,
    citations: [
      {
        title: 'Java Concurrency in Practice (Chapter 15: Non-blocking Synchronization)',
        source: 'Brian Goetz, Tim Peierls, Joshua Bloch (Addison-Wesley)',
        url: 'https://jcip.net/',
        snippet: 'Details hardware CAS primitives, atomic variables, and implementing lock-free stacks and queues.',
      },
      {
        title: 'The Art of Multiprocessor Programming',
        source: 'Maurice Herlihy & Nir Shavit (Morgan Kaufmann)',
        url: 'https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5',
        snippet: 'Rigorous formal proofs of wait-free consensus, ABA hazard pointers, and cache coherence protocols.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Concurrency & Thread Safety',
    difficulty: 2,
    prompt: 'How do you detect and prevent deadlocks in distributed concurrent services? Explain Coffman\'s four conditions and how resource ordering breaks the cycle.',
    answer_outline: 'High-scoring response covers: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Demonstrates global hierarchical lock ordering, lock timeouts with exponential jitter, and distributed deadlock graphs.',
    expert_answer: `Deadlocks occur if and only if all four Coffman conditions hold simultaneously:
1. Mutual Exclusion: At least one resource is held in a non-shareable mode.
2. Hold and Wait: A process holds one resource while requesting others.
3. No Preemption: Resources cannot be forcibly revoked from holding processes.
4. Circular Wait: A closed chain of processes exists where each holds a resource requested by the next.

Elimination via Global Resource Hierarchy:
Assign a strict, monotonic numeric index to all lockable resources across the cluster (e.g., account IDs, DB row keys). All transaction routines MUST acquire resources strictly in ascending order: Lock(min(idA, idB)) followed by Lock(max(idA, idB)). This mathematically invalidates Circular Wait, guaranteeing cycle-free execution.`,
    citations: [
      {
        title: 'System Deadlocks',
        source: 'Edward G. Coffman Jr., Michael J. Elphick, Arie Shoshani (ACM Computing Surveys, 1971)',
        url: 'https://dl.acm.org/doi/10.1145/356586.356588',
        snippet: 'The foundational academic paper formulating the necessary and sufficient conditions for system deadlock.',
      },
      {
        title: 'Database Systems: The Complete Book (Concurrency Control)',
        source: 'Hector Garcia-Molina, Jeffrey D. Ullman, Jennifer Widom (Prentice Hall)',
        url: 'http://infolab.stanford.edu/~ullman/dscb.html',
        snippet: 'Covers Wait-Die and Wound-Wait timestamp-based distributed deadlock prevention.',
      },
    ],
  },

  // =========================================================================
  // TECHNICAL: Network Protocols & API Contracts
  // =========================================================================
  {
    category: 'technical',
    subcategory: 'Network Protocols & API Contracts',
    difficulty: 3,
    prompt: 'How do you architect an idempotent payment processing API to guarantee zero duplicate financial transactions during client timeouts, network retries, and gateway crashes?',
    answer_outline: 'High-scoring response covers: Idempotency keys (UUIDv4) in HTTP headers, distributed atomic locking in Redis (SET NX with TTL), transaction state machine, and atomic database commits with cryptographic signatures.',
    expert_answer: `Production Idempotency Architecture:
1. Client Generation: The client issues an 'Idempotency-Key: <uuid>' header in the HTTP request.
2. Distributed In-Progress Lock: The API gateway executes an atomic Redis command: \`SET idempotency:{key} "IN_PROGRESS" NX EX 120\`. If the key already exists and status is IN_PROGRESS, return HTTP 409 Conflict or wait on a pub/sub subscription.
3. Deduplication Store: If the key status is "COMPLETED", return the exact cached response payload and HTTP status code immediately without executing payment settlement logic.
4. Two-Phase Ledger Commit: The backend processes payment inside an ACID transaction with an append-only ledger entry tagged with the idempotency key.
5. Release and Cache: Upon transaction commit, update the Redis key to status "COMPLETED" with the full response body and a 24-hour expiration window.`,
    citations: [
      {
        title: 'Designing Robust Idempotent APIs with Idempotency Keys',
        source: 'Brandur Leach, Stripe Engineering Blog',
        url: 'https://stripe.com/blog/idempotency',
        snippet: 'The definitive industry standard architecture for preventing duplicate charges using database locking and cache layers.',
      },
      {
        title: 'RFC 9110: HTTP Semantics (Section 9.2.2: Idempotent Methods)',
        source: 'Internet Engineering Task Force (IETF)',
        url: 'https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2',
        snippet: 'Specifies semantic expectations for safe and idempotent HTTP methods.',
      },
    ],
  },
  {
    category: 'technical',
    subcategory: 'Network Protocols & API Contracts',
    difficulty: 2,
    prompt: 'Compare HTTP/2 multiplexing with HTTP/1.1 pipelining. What causes TCP Head-of-Line (HoL) blocking, and how does HTTP/3 over QUIC eliminate it?',
    answer_outline: 'High-scoring response covers: Binary framing layer, stream IDs, TCP packet loss halting all multiplexed streams in HTTP/2, and UDP-based independent streams in QUIC.',
    expert_answer: `1. HTTP/1.1 vs HTTP/2: HTTP/1.1 required separate TCP handshakes or serialized pipelining where response ordering was rigid. HTTP/2 introduces a binary framing layer splitting requests into streams multiplexed over a single TCP connection.
2. TCP Head-of-Line Blocking in HTTP/2: Because TCP enforces in-order byte delivery at the transport layer, if a single packet belonging to Stream 1 is dropped on the wire, the operating system kernel holds all subsequent packets in the receive buffer—freezing Stream 2, Stream 3, and Stream 4 until the dropped packet is retransmitted.
3. QUIC & HTTP/3 Solution: QUIC operates over UDP. It re-implements congestion control and packet sequencing per stream. If a packet on Stream 1 is lost, only Stream 1 pauses; Stream 2 and Stream 3 continue processing without interruption.`,
    citations: [
      {
        title: 'RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport',
        source: 'Internet Engineering Task Force (IETF)',
        url: 'https://www.rfc-editor.org/rfc/rfc9000.html',
        snippet: 'The standard protocol specification detailing stream multiplexing without transport HoL blocking.',
      },
      {
        title: 'High Performance Browser Networking (Chapter 12: HTTP/2 & Chapter 13: QUIC)',
        source: 'Ilya Grigorik (O\'Reilly Media)',
        url: 'https://hpbn.co/',
        snippet: 'Analyzes binary framing, stream prioritization, flow control, and zero-RTT connection establishment.',
      },
    ],
  },

  // =========================================================================
  // TECHNICAL: Database Storage Engines & Optimization
  // =========================================================================
  {
    category: 'technical',
    subcategory: 'Database Storage & Query Engines',
    difficulty: 3,
    prompt: 'Compare the internal architectures of B+ Trees and Log-Structured Merge (LSM) Trees. Under what read/write workload characteristics does an LSM-Tree outperform a B+ Tree, and what is write amplification?',
    answer_outline: 'High-scoring response covers: In-place vs append-only disk mutations, MemTable (SSTables), Compaction strategies (Size-Tiered vs Leveled), Write Amplification Factor (WAF), and Bloom filters for read speedups.',
    expert_answer: `1. Structural Differences:
   - B+ Tree: In-place updates. Writes locate leaf pages on disk and overwrite 4KB/8KB pages. Reads require O(log_B N) page traverses, where fan-out B is typically 100-500.
   - LSM-Tree: Out-of-place append-only writes. Writes buffer in an in-memory sorted MemTable (SkipList/Red-Black tree) accompanied by a Write-Ahead Log (WAL). When full, the MemTable flushes to an immutable SSTable on disk in sequential I/O blocks.
2. Workload Performance Comparison:
   - Write-Heavy Workloads: LSM-trees achieve 10x higher write throughput because every write is sequential I/O, avoiding random disk seeks.
   - Read Workloads: B+ Trees offer faster point reads because a key exists in exactly one leaf page. LSM-trees must check multiple SSTable levels, mitigated by in-memory Bloom Filters.
3. Write Amplification Factor (WAF): The ratio of bytes written to underlying storage versus bytes requested by user writes. Compaction cycles in LSM-trees read, sort, and re-write data repeatedly, requiring careful tuning between Size-Tiered (low write amp, high space amp) and Leveled (high write amp, low space amp) compaction.`,
    citations: [
      {
        title: 'Designing Data-Intensive Applications (Chapter 3: Storage and Retrieval)',
        source: 'Martin Kleppmann (O\'Reilly Media)',
        url: 'https://dataintensive.net/',
        snippet: 'Deep dive into SSTables, LSM trees, compaction strategies, and B-Tree page layouts.',
      },
      {
        title: 'Database Internals: A Deep Dive into How Distributed Data Systems Work',
        source: 'Alex Petrov (O\'Reilly Media)',
        url: 'https://www.databass.dev/',
        snippet: 'Explains internal storage engines, write amplification math, and concurrency control in modern databases.',
      },
    ],
  },

  // =========================================================================
  // SYSTEM DESIGN: High-Throughput Distributed Architecture
  // =========================================================================
  {
    category: 'system-design',
    subcategory: 'High-Throughput Distributed Architecture',
    difficulty: 3,
    prompt: 'Design a globally distributed URL shortening service (like Bitly) handling 100,000 writes/sec and 2,000,000 reads/sec with 99.999% availability and sub-10ms P99 read latency.',
    answer_outline: 'High-scoring response covers: Base62 encoding, 64-bit unique ID generation (Snowflake or ZooKeeper token ranges), write sharding, Redis cluster read caching, and multi-region Anycast routing.',
    expert_answer: `Architectural Blueprint:
1. ID Generation (Preventing Collision & Mutex Bottlenecks):
   - Use Twitter Snowflake (64-bit integer: 41 bits epoch timestamp, 10 bits machine/datacenter ID, 12 bits sequence number).
   - Alternatively, allocate numeric ID blocks in batches of 1,000,000 via a central distributed consensus cluster (Raft/ZooKeeper) so worker nodes generate sequential Base62 keys in local memory without inter-node chatter.
2. Storage & Sharding:
   - Primary Storage: Distributed NoSQL Key-Value Store (ScyllaDB / Cassandra) using the Base62 short_hash as the partition key, yielding O(1) hash lookups.
   - Read Caching: Multi-region Redis Cluster configured with an LRU eviction policy. Given the Pareto 80/20 distribution, caching top 20% URLs satisfies 85% of traffic from RAM.
3. Edge Routing: Cloudflare/Fastly CDN with Anycast DNS terminating TLS at the edge and returning 301 Permanent Redirects directly from edge cache where possible.`,
    citations: [
      {
        title: 'System Design Interview – An Insider\'s Guide (Volume 1 & 2)',
        source: 'Alex Xu & Sahn Lam (ByteByteGo)',
        url: 'https://bytebytego.com/',
        snippet: 'Canonical architectural patterns for distributed URL shorteners, key generation services, and caching hierarchies.',
      },
      {
        title: 'Snowflake: Distributed Unique ID Generation at Twitter Scale',
        source: 'Twitter Engineering Blog (Open Source Archive)',
        url: 'https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake',
        snippet: 'Explains timestamp-based 64-bit ID generation without database coordination.',
      },
    ],
  },

  // =========================================================================
  // SYSTEM DESIGN: Partitioning, Sharding & Consistent Hashing
  // =========================================================================
  {
    category: 'system-design',
    subcategory: 'Partitioning, Sharding & Consistent Hashing',
    difficulty: 3,
    prompt: 'How does consistent hashing with virtual nodes prevent data skew and rebalancing cascades when adding or removing database nodes in a distributed cluster?',
    answer_outline: 'High-scoring response covers: 360-degree hash ring, MurmurHash3, virtual node replication factors (e.g. 150-200 vnodes per physical server), and bounded O(K/N) key migration on topology changes.',
    expert_answer: `1. The Problem with Modulo Sharding: Simple hash(key) % N requires migrating nearly all keys (~(N-1)/N) when the node count N changes, causing network saturation and thundering herd outages.
2. Consistent Hashing Mechanics: Both keys and node identifiers are mapped onto a uniform circular ring [0, 2^32 - 1]. A key is assigned to the first node encountered clockwise. When a node leaves or joins, only keys between it and its predecessor migrate (O(K/N) fraction of keys).
3. Virtual Nodes (vNodes):
   - A single physical node is mapped to 100-250 virtual positions across the ring using salted hashes: \`hash("node_ip:port#v1")\`.
   - Benefits: Eliminates hot spots caused by uneven hash distribution, ensures proportional load distribution across heterogeneous server hardware, and allows rebalancing load across ALL remaining nodes rather than overloading a single direct successor.`,
    citations: [
      {
        title: 'Dynamo: Amazon\'s Highly Available Key-value Store',
        source: 'Giuseppe DeCandia et al. (ACM SIGOPS SOSP 2007)',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
        snippet: 'The foundational publication describing consistent hashing with virtual nodes and sloppy quorums.',
      },
      {
        title: 'Consistent Hashing and Random Trees: Distributed Caching Protocols for Relieving Hot Spots on the World Wide Web',
        source: 'David Karger et al. (ACM STOC 1997)',
        url: 'https://dl.acm.org/doi/10.1145/258533.258660',
        snippet: 'The mathematical foundation of consistent hash rings and key distribution bounds.',
      },
    ],
  },

  // =========================================================================
  // SYSTEM DESIGN: Cache Invalidation & Distributed Consistency
  // =========================================================================
  {
    category: 'system-design',
    subcategory: 'Cache Invalidation & Distributed Consistency',
    difficulty: 3,
    prompt: 'How does Facebook/Meta solve cache consistency across thousands of Memcached servers and MySQL replicas? Explain the role of McSqueezy, lease tokens, and binlog tailing.',
    answer_outline: 'High-scoring response covers: Look-aside caching, cache stampede mitigation using leases, stale read races where a delayed read overwrites newer data, and asynchronous invalidation via MySQL binlog tailing (Wormhole/McSqueezy).',
    expert_answer: `1. Cache Stampede & Thundering Herd: When a popular key expires, thousands of concurrent requests miss cache and assault the database. Meta uses 'Lease Tokens': on a cache miss, Memcached issues a 64-bit lease token allowing only ONE worker to query MySQL, while other requests wait or return slightly stale data.
2. The Stale-Set Race Condition:
   - Worker 1 queries DB (returns Old Value).
   - Write transaction commits in DB (New Value) and sends invalidation to Memcached.
   - Worker 1 finally receives DB response and sets Memcached with Old Value, permanently poisoning the cache.
   - Solution: Memcached only allows a \`SET\` if the worker presents a valid lease token. Because the write transaction invalidated the key, Worker 1's lease token is revoked, preventing the stale write.
3. Asynchronous Replication Invalidation: Writes write strictly to MySQL. An asynchronous tailing daemon (Wormhole) tails the MySQL binary replication log and sends cache deletes across all regional clusters.`,
    citations: [
      {
        title: 'Scaling Memcache at Facebook',
        source: 'Rajesh Nishtala et al. (USENIX NSDI 2013)',
        url: 'https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala',
        snippet: 'Details lease tokens, mitigating thundering herds, and maintaining consistency between Memcache and MySQL.',
      },
      {
        title: 'Designing Data-Intensive Applications (Chapter 11: Stream Processing)',
        source: 'Martin Kleppmann (O\'Reilly Media)',
        url: 'https://dataintensive.net/',
        snippet: 'Covers Change Data Capture (CDC) via binlog tailing for cache and search index consistency.',
      },
    ],
  },

  // =========================================================================
  // SYSTEM DESIGN: Event-Driven Streaming & Message Brokers
  // =========================================================================
  {
    category: 'system-design',
    subcategory: 'Event-Driven Streaming & Message Brokers',
    difficulty: 3,
    prompt: 'How does Apache Kafka achieve Exactly-Once Semantics (EOS) across distributed producers, topics, and consumers? What are transactional coordinator logs and idempotent producer IDs?',
    answer_outline: 'High-scoring response covers: PID (Producer ID) and sequence numbers for partition deduplication, Transaction Coordinator, Two-Phase Commit markers in the log, and isolation level \'read_committed\'.',
    expert_answer: `Kafka Exactly-Once Processing (EOS) combines two mechanisms:
1. Idempotent Producer (Single Partition EOS):
   - The broker assigns each producer an internal 64-bit Producer ID (PID).
   - Each batch sent carries a monotonically increasing sequence number per partition. The broker verifies that incoming sequence == last_seen + 1, rejecting duplicates without returning errors to the producer.
2. Multi-Partition Atomic Transactions (Consume-Transform-Produce):
   - Transaction Coordinator: A dedicated broker managing an internal \`__transaction_state\` log.
   - Two-Phase Commit (2PC):
     a. Producer registers partitions with the Transaction Coordinator.
     b. Writes data messages to target topics.
     c. Sends consumer offset commits to the consumer offsets topic as part of the transaction.
     d. Initiates Commit: Coordinator writes 'PREPARE_COMMIT' to its log, writes special 'COMMIT MARKERS' to all participating topic partitions, and writes 'COMMITTED'.
3. Consumer Isolation: Consumers configure \`isolation.level = read_committed\`. The consumer buffers messages and only yields records to application code once an explicit Commit Marker has passed.`,
    citations: [
      {
        title: 'Transactions in Apache Kafka',
        source: 'Guozhang Wang et al., Confluent Engineering / Apache Kafka (KIP-98)',
        url: 'https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/',
        snippet: 'Official architecture specification for idempotent producers and transactional coordinators in Kafka.',
      },
      {
        title: 'Kafka: A Distributed Messaging System for Log Processing',
        source: 'Jay Kreps, Neha Narkhede, Jun Rao (NetDB 2011)',
        url: 'https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf',
        snippet: 'The seminal LinkedIn paper introducing partitioning, append-only logs, and consumer offset models.',
      },
    ],
  },

  // =========================================================================
  // BEHAVIOURAL: Conflict Resolution & Disagree and Commit
  // =========================================================================
  {
    category: 'behavioural',
    subcategory: 'Conflict Resolution & Disagree and Commit',
    difficulty: 2,
    prompt: 'Describe a situation where you had a deep architectural disagreement with a Principal Engineer or Manager. How did you advocate your perspective with empirical data, and how did you proceed after the final decision was made?',
    answer_outline: 'High-scoring response covers: Respectful professional discourse, benchmarking and prototyping rather than opinion battles, accepting the decision under the \'Disagree and Commit\' principle, and full ownership during execution.',
    expert_answer: `Exemplary STAR Framework Response Structure:
1. Situation: During the architectural redesign of an ingestion pipeline, leadership favored adopting an unproven graph database, while our team advocated extending our partitioned PostgreSQL cluster to avoid operational risk.
2. Task: Provide concrete data to ensure the business made an informed risk-adjusted decision without creating organizational deadlock or emotional animosity.
3. Action:
   - Built an empirical benchmark harness simulating peak load (20,000 ops/sec).
   - Generated synthetic production data and proved that the new graph database exhibited unpredictable GC pauses (>4s P99), whereas Postgres with BRIN indexes met the 200ms latency budget.
   - Presented findings transparently, framing the decision around business SLAs and operational maintenance overhead rather than personal preferences.
   - When leadership ultimately decided to proceed with the graph database due to vendor partnership agreements, I transitioned to "Disagree and Commit": helped architect the failover circuit breakers and zero-downtime fallback to protect user experience.
4. Result: Successfully launched the service on schedule; our preventative circuit breaker safely mitigated two early vendor cluster stalls, avoiding customer-facing outages.`,
    citations: [
      {
        title: 'High Output Management (Chapter 7: Managerial Leverage & Decisions)',
        source: 'Andrew S. Grove (Former CEO of Intel)',
        url: 'https://www.penguinrandomhouse.com/books/72793/high-output-management-by-andrew-s-grove/',
        snippet: 'Defines the foundational management tenet: "Free discussion, clear decision, full commitment from everyone."',
      },
      {
        title: 'Amazon Leadership Principles: Have Backbone; Disagree and Commit',
        source: 'Amazon Executive Operational Guidelines',
        url: 'https://www.aboutamazon.com/about-us/leadership-principles',
        snippet: 'Leaders are obligated to respectfully challenge decisions when they disagree, even when doing so is uncomfortable or exhausting.',
      },
    ],
  },

  // =========================================================================
  // BEHAVIOURAL: Ambiguity, Tight Deadlines & Execution Velocity
  // =========================================================================
  {
    category: 'behavioural',
    subcategory: 'Ambiguity & Execution Velocity',
    difficulty: 2,
    prompt: 'Tell me about a time you had to deliver a business-critical system with vague requirements and an aggressive deadline. How did you decouple requirements, manage technical debt, and ensure reliability?',
    answer_outline: 'High-scoring response covers: Deconstructing vague objectives into high-conviction MVPs, establishing weekly feedback loops, intentional technical debt containment with audit tickets, and automated guardrails.',
    expert_answer: `Exemplary Response Strategy:
1. Deconstructing Ambiguity: When tasked with launching an enterprise billing auditing engine within 6 weeks without finalized regulatory specs, I set up a twice-weekly sync with the Head of Compliance to draft an initial invariant contract.
2. Aggressive Scoping & Critical Path Analysis: Identified that 80% of enterprise audit value came from tracking 4 core currency mutations. Quarantined complex edge-case conversions for Phase 2.
3. Intentional Technical Debt Containment: To move quickly, we opted for synchronous worker processing instead of an event bus, but strictly isolated all billing domain logic behind well-defined domain interfaces. We filed Jira tech-debt tickets with target migration dates before shipping.
4. Result: Delivered on day 38 with zero compliance violations. The modular interfaces allowed us to swap the underlying execution engine to Kafka in Phase 2 with zero changes to downstream business logic.`,
    citations: [
      {
        title: 'Accelerate: The Science of Lean Software and DevOps',
        source: 'Nicole Forsgren, Jez Humble, Gene Kim (IT Revolution Press)',
        url: 'https://itrevolution.com/book/accelerate/',
        snippet: 'Proves with empirical data that high-performing engineering teams balance rapid deployment frequency with disciplined mean-time-to-recovery.',
      },
      {
        title: 'Staff Engineer: Leadership Beyond the Management Track',
        source: 'Will Larson (Tanya Reilly / Stripe Press)',
        url: 'https://staffeng.com/',
        snippet: 'Guides managing ambiguity, shaping engineering strategy, and leading high-velocity initiatives.',
      },
    ],
  },

  // =========================================================================
  // BEHAVIOURAL: Failure, Post-Mortem & Blameless Accountability
  // =========================================================================
  {
    category: 'behavioural',
    subcategory: 'Failure, Post-Mortem & Blameless Accountability',
    difficulty: 3,
    prompt: 'Walk through the most severe production outage you caused or triaged. How did you restore service under pressure, lead the blameless post-mortem, and implement systemic defenses against recurrence?',
    answer_outline: 'High-scoring response covers: Immediate incident mitigation (rollback/traffic redirection) before root-cause analysis, psychological safety in blameless retro, 5-Whys analysis, and automated guardrails (linting/canarying).',
    expert_answer: `Exemplary Post-Mortem Framework:
1. Triage Under Fire: A database migration script deployed during an off-peak maintenance window locked the primary user table due to an unindexed foreign key check, causing incoming HTTP connections to back up and crash the upstream API gateway pool.
2. Mitigation First, Root Cause Second: Rather than attempting to patch the SQL migration live, we immediately aborted the migration transaction and triggered an automated rollback to restore system throughput within 7 minutes.
3. The Blameless Retrospective: Guided the team away from individual blame ("Engineer X ran bad SQL") and focused on systemic failure modes:
   - Why was an unindexed FK allowed to execute? (Absence of pre-deployment DDL lock checks in CI).
   - Why was it executed in production without canary isolation? (Migrations were monolithic).
4. Systemic Defenses Implemented:
   - Added \`pg-query-audit\` linter to our GitHub Actions CI pipeline to fail any PR containing locks that exceed 500ms.
   - Enforced zero-downtime migration standards (Add column nullable -> backfill -> add constraint with \`NOT VALID\` -> validate asynchronously).`,
    citations: [
      {
        title: 'Site Reliability Engineering: How Google Runs Production Systems (Chapter 15)',
        source: 'Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Murphy (O\'Reilly)',
        url: 'https://sre.google/sre-book/postmortem-culture/',
        snippet: 'Outlines the foundational Google SRE principles of blameless post-mortem culture and psychological safety.',
      },
      {
        title: 'Debriefing Facilitation Guide for Blameless Post-Mortems',
        source: 'John Allspaw (Etsy Engineering Blog / Adaptive Capacity Labs)',
        url: 'https://www.adaptivecapacitylabs.com/',
        snippet: 'Explains human factors, complex system safety, and learning from operational failure.',
      },
    ],
  },

  // =========================================================================
  // COMPANY FIT: Strategic Alignment & Business Model Mechanics
  // =========================================================================
  {
    category: 'company-fit',
    subcategory: 'Strategic Alignment & Business Model',
    difficulty: 2,
    prompt: 'How does high software engineering discipline (e.g., automated CI/CD, P99 latency optimization, architectural decoupling) directly impact our company\'s gross margins and enterprise customer retention?',
    answer_outline: 'High-scoring response covers: Infrastructure cost efficiency (reduced cloud spend), customer SLA penalties, Developer Productivity metrics, Net Revenue Retention (NRR), and time-to-market for enterprise contracts.',
    expert_answer: `Connecting Systems Engineering to Enterprise Unit Economics:
1. Infrastructure Gross Margin Impact: In SaaS and cloud-native businesses, cloud infrastructure costs directly reduce Cost of Goods Sold (COGS), lowering gross margin. Optimizing query latency from 500ms to 40ms allows services to handle 10x traffic on the same compute footprint, converting operational efficiency straight into bottom-line EBITDA.
2. Enterprise SLA Guarantees & Retention: Enterprise contracts contain strict Service Level Agreements (SLAs) with financial clawback penalties if availability drops below 99.99%. Preventing downtime preserves Customer Lifetime Value (LTV) and Net Revenue Retention (NRR).
3. Developer Velocity & Opportunity Cost: Fast, automated CI/CD reduces cycle time from weeks to hours, allowing the sales and product teams to close enterprise feature requests before competitors.`,
    citations: [
      {
        title: '7 Powers: The Foundations of Business Strategy (Chapter 4: Process Power)',
        source: 'Hamilton Helmer (DeepSee Publishing)',
        url: 'https://7powers.com/',
        snippet: 'Defines how proprietary organizational engineering processes create sustainable cost and quality moats.',
      },
      {
        title: 'Stratechery: Aggregation Theory and Platform Business Models',
        source: 'Ben Thompson',
        url: 'https://stratechery.com/concept/aggregation-theory/',
        snippet: 'Analyzes digital platform economics, zero marginal costs, and enterprise ecosystem retention.',
      },
    ],
  },

  // =========================================================================
  // COMPANY FIT: Cultural Principles & Operating Tenets
  // =========================================================================
  {
    category: 'company-fit',
    subcategory: 'Cultural Principles & Operating Tenets',
    difficulty: 2,
    prompt: 'How do you practice "Extreme Ownership" when an upstream third-party API or downstream microservice belonging to another team breaks your feature in production?',
    answer_outline: 'High-scoring response covers: Refusing to point fingers at external teams, proactive defensive engineering (circuit breakers, fallbacks, defensive validation), and clear stakeholder communication.',
    expert_answer: `Extreme Ownership in Distributed Systems:
1. Ownership Principle: When my feature fails, it is MY failure to account for external dependency volatility—regardless of whether the root cause originated in a third-party vendor or sister team.
2. Defensive Architecture:
   - Implement strict timeouts (e.g. 500ms connect, 1500ms read) and exponential backoff with full jitter to avoid self-DDoS.
   - Enforce Circuit Breakers (Resilience4j / Envoy) so that if the external service fails, my system immediately returns graceful fallback cached data without exhausting thread pools.
   - Maintain contract validation via automated consumer-driven contract testing (Pact) in pre-production.
3. Communication & Post-Incident Collaboration: Rather than accusing the upstream team, I author a constructive post-mortem detailing how our integration contract can be strengthened with automated alerts and mutual SLO monitoring.`,
    citations: [
      {
        title: 'Extreme Ownership: How U.S. Navy SEALs Lead and Win',
        source: 'Jocko Willink & Leif Babin (St. Martin\'s Press)',
        url: 'https://echelonfront.com/extreme-ownership/',
        snippet: 'The definitive manifesto on accepting total responsibility for team outcomes and eliminating excuse cultures.',
      },
      {
        title: 'Principles: Life and Work',
        source: 'Ray Dalio (Simon & Schuster)',
        url: 'https://www.principles.com/',
        snippet: 'Explains radical truth, radical transparency, and machine-like problem diagnosis.',
      },
    ],
  },
];

/**
 * Generates an expanded batch of questions (e.g. 10, 20, 35) across the specified
 * category or subcategory, linked to the given requirements, company, role, and seniority level.
 */
export function generateExpandedBatch({
  category,
  subcategory,
  count = 10,
  requirements,
  companyName = 'Target Company',
  roleTitle = 'Software Engineer',
  seniority,
  startIndex = 1,
}: {
  category?: QuestionCategory;
  subcategory?: string;
  count: number;
  requirements: Requirement[];
  companyName?: string;
  roleTitle?: string;
  seniority?: string;
  startIndex: number;
}): Question[] {
  const result: Question[] = [];
  const reqIds = requirements.length > 0 ? requirements.map((r) => r.id) : ['r1'];
  const targetDifficulty = mapSeniorityToTargetDifficulty(seniority, roleTitle);
  const canonSub = subcategory ? canonicalizeSubcategory(subcategory) : undefined;

  // Filter curated bank by category / subcategory if specified
  let candidates = VERIFIED_EXPERT_QUESTION_BANK.filter((item) => {
    if (category && item.category !== category) return false;
    if (canonSub && !matchSubcategory(canonSub, item.subcategory)) return false;
    return true;
  });

  if (candidates.length === 0) {
    // If exact subcategory filter produced no items, try matching category
    candidates = VERIFIED_EXPERT_QUESTION_BANK.filter((item) => {
      if (category && item.category !== category) return false;
      return true;
    });
    if (candidates.length === 0) {
      candidates = VERIFIED_EXPERT_QUESTION_BANK;
    }
  }

  // Sort candidates by alignment with the target interview/seniority level
  const sortedCandidates = [...candidates].sort((a, b) => {
    const scoreA =
      a.difficulty === targetDifficulty ? 0 : Math.abs(a.difficulty - targetDifficulty);
    const scoreB =
      b.difficulty === targetDifficulty ? 0 : Math.abs(b.difficulty - targetDifficulty);
    return scoreA - scoreB;
  });

  // Track unique prompts to avoid duplicate questions in the batch
  const usedPrompts = new Set<string>();

  for (let i = 0; i < count; i++) {
    const qId = `q${startIndex + i}`;
    const baseIndex = i % sortedCandidates.length;
    const base = sortedCandidates[baseIndex];
    const cycle = Math.floor(i / sortedCandidates.length);
    const resolvedSub = canonSub || canonicalizeSubcategory(base.subcategory);
    const reqId = reqIds[i % reqIds.length];

    // Build unique, context-rich prompt tailored to role, seniority level, and company
    let promptText = base.prompt;
    if (cycle > 0) {
      // For subsequent cycles beyond unique bank items, create distinct architectural & operational angles
      const variantAngles = [
        `[Scale & Throughput Angle] How would you architect this under 100x traffic volume at ${companyName}?`,
        `[Edge Case & Resilience Angle] What failover mechanisms or bounded degraded modes apply to this at ${companyName}?`,
        `[Operational Telemetry Angle] What SLI/SLO metrics, p99 latency alerts, and profiling tools would you wire into this solution for a ${roleTitle}?`,
        `[Memory & Storage Angle] What are the write-amplification and garbage-collection invariants for this implementation under peak load?`,
        `[Testing & Contract Angle] How would you structure chaos engineering and property-based automated tests for this component?`,
      ];
      const angle = variantAngles[(cycle - 1) % variantAngles.length];
      promptText = `${base.prompt} ${angle}`;
    }

    // Ensure prompt uniqueness
    let finalPrompt = promptText;
    let counter = 1;
    while (usedPrompts.has(finalPrompt)) {
      finalPrompt = `${promptText} (Scenario variant ${counter} for ${roleTitle})`;
      counter++;
    }
    usedPrompts.add(finalPrompt);

    result.push({
      id: qId,
      requirement_ids: [reqId],
      category: category || base.category,
      subcategory: resolvedSub,
      prompt: finalPrompt,
      answer_outline: base.answer_outline,
      expert_answer: base.expert_answer,
      citations: base.citations,
      difficulty: base.difficulty,
      isCustom: false,
    });
  }

  return result;
}
