"""
Universal Knowledge Base for INDRA AI Workbench (v2.0)
Gold-standard, human-readable, beautifully structured first-principles knowledge
across Computer Science, Chemistry, Biology, Mathematics, Economics, Astronomy,
History, and Everyday Technology.
Zero broken LaTeX, zero raw backslash corruption, clean Markdown typography.
"""
from typing import Dict, Any, Optional
import re

UNIVERSAL_TOPICS: Dict[str, Dict[str, Any]] = {
    # =========================================================================
    # 1. COMPUTER SCIENCE & SOFTWARE ENGINEERING
    # =========================================================================
    "neural_networks_and_deep_learning": {
        "domain": "computer_science",
        "title": "Artificial Neural Networks, Deep Learning & Backpropagation",
        "keywords": [
            "neural network", "deep learning", "backpropagation", "gradient descent",
            "activation function", "perceptron", "loss function", "convolutional neural",
            "cnn", "rnn", "lstm", "overfitting", "machine learning"
        ],
        "content": """### Artificial Neural Networks (ANNs) & Backpropagation

An **Artificial Neural Network** is a computational system inspired by biological neural networks in the human brain. It learns to recognize patterns, make predictions, and approximate complex functions by tuning interconnected numerical weights through training.

---

#### 1. How a Neural Network is Structured

A standard feedforward network is organized into sequential layers of artificial "neurons":

- **Input Layer:** Receives the raw feature data (e.g., pixel intensities, audio waveforms, or tabular parameters).
- **Hidden Layers:** Intermediate layers that transform inputs into increasingly abstract hierarchical features (e.g., detecting edges → textures → complex objects).
- **Output Layer:** Delivers the final prediction (e.g., probability distribution across categories or a continuous numerical value).

Within each layer, every neuron computes a weighted sum of its inputs and applies an activation function:

```
Neuron Output = Activation( (Weight_1 × Input_1) + (Weight_2 × Input_2) + ... + Bias )
```

- **Weights (W):** Adjustable parameters determining the strength and direction of each connection.
- **Bias (b):** An offset value that allows the neuron to shift its activation threshold.
- **Activation Function:** Introduces non-linearity, enabling the network to learn arbitrary non-linear patterns rather than simple linear combinations.

---

#### 2. What is Backpropagation & How Does It Work?

**Backpropagation** (backward propagation of errors) is the mathematical algorithm used to train neural networks. It systematically computes how much each individual weight contributed to the overall prediction error, enabling the model to learn.

Training proceeds in four linked phases:

1. **Forward Pass:**
   Input features flow forward through each layer to produce an output prediction $ŷ$.

2. **Loss (Error) Evaluation:**
   A **Loss Function** measures the discrepancy between the network's prediction and the true target:
   - *Classification:* Categorical Cross-Entropy loss.
   - *Regression:* Mean Squared Error (MSE).

3. **Backward Pass (The Chain Rule):**
   Using the **Chain Rule of Calculus**, the algorithm propagates errors backwards from the output layer to the input layer. It computes the partial derivative (gradient) of the loss with respect to every weight:
   ```
   Gradient = ∂Loss / ∂Weight
   ```
   This gradient reveals the direction and magnitude to adjust each weight to minimize error.

4. **Weight Update (Gradient Descent):**
   An optimizer adjusts each weight in the opposite direction of its gradient:
   ```
   New_Weight = Current_Weight - (Learning_Rate × Gradient)
   ```
   Modern optimizers like **Adam (Adaptive Moment Estimation)** dynamically calculate individualized learning rates for each parameter based on running averages of past gradients.

---

#### 3. Common Activation Functions

- **ReLU (Rectified Linear Unit):** `f(x) = max(0, x)` — The most widely used activation in hidden layers; computationally efficient and prevents vanishing gradients for positive activations.
- **GELU (Gaussian Error Linear Unit):** Smooth approximation used in modern Transformer architectures (GPT, Llama, BERT).
- **Sigmoid:** `σ(x) = 1 / (1 + e^-x)` — Squashes values between 0 and 1; historically popular, now primarily used for binary classification output layers.
- **Softmax:** Normalizes a vector of arbitrary real values into a valid probability distribution that sums to 1.0 (ideal for multi-class classification).

---

#### 4. The Sound Mixer Analogy

Think of training a neural network like tuning a massive audio mixing console with millions of individual dials:
1. **Play the track** (Forward Pass)
2. **Listen to the distortion** (Loss Calculation)
3. **Pinpoint exactly which dials caused the harsh frequency** (Backpropagation via Chain Rule)
4. **Nudge those specific dials slightly** (Gradient Descent update)
Repeated over millions of training examples, the network converges to the optimal dial settings."""
    },

    "transformer_architecture_and_llms": {
        "domain": "computer_science",
        "title": "The Transformer Architecture & Large Language Models (LLMs)",
        "keywords": [
            "transformer", "attention mechanism", "self attention", "large language model",
            "llm", "gpt", "bert", "attention is all you need", "multi-head attention",
            "tokenization", "generative ai"
        ],
        "content": """### The Transformer Architecture & Large Language Models (LLMs)

Introduced in the 2017 paper *"Attention Is All You Need"* (Vaswani et al.), the **Transformer** revolutionized artificial intelligence by replacing sequential recurrent architectures (RNNs and LSTMs) with a fully parallelizable **Self-Attention Mechanism**. It serves as the foundation for modern Large Language Models (LLMs) like GPT-4, Llama, and Claude.

---

#### 1. The Core Self-Attention Mechanism

Traditional recurrent models processed language one word at a time, making long-distance context retention difficult. Self-attention enables every token in an input sequence to examine and assign contextual weights to every other token simultaneously.

For each token, the model projects its embedding into three learned vectors:
- **Query (Q):** Represents what the current token is seeking context about.
- **Key (K):** Represents what information the token offers to others.
- **Value (V):** The actual informational content of the token.

The attention weights are computed using **Scaled Dot-Product Attention**:

```
Attention(Q, K, V) = Softmax( (Q × K^T) / √d_k ) × V
```

- The dot product `Q × K^T` measures the semantic affinity between tokens.
- The scaling factor `1 / √d_k` prevents dot products from growing excessively large, which would cause the softmax function to saturate with near-zero gradients.

---

#### 2. Key Architectural Innovations

- **Multi-Head Attention:** Instead of computing attention once, queries, keys, and values are projected multiple times into distinct subspaces. This allows the model to simultaneously capture different linguistic relationships (e.g., grammatical agreement, coreference, syntactic dependency).
- **Positional Encoding:** Because self-attention is order-agnostic (permutation-invariant), positional information is added to token embeddings using sinusoidal frequencies or Rotary Position Embeddings (RoPE).
- **Residual Connections & Layer Normalization:** Skip connections (`x + Sublayer(x)`) and LayerNorm stabilize gradient flow, allowing networks to be stacked 80+ layers deep without degradation.

---

#### 3. How Autoregressive Generation Works (GPT Style)

Modern generative models utilize a **decoder-only** Transformer:
1. **Causal Masking:** An attention mask ensures the model can only attend to past tokens, preventing it from "peeking" into the future during training.
2. **Next-Token Prediction:** Given a prompt, the model calculates probability distributions over its vocabulary (typically 32,000–128,000 tokens) for the next token.
3. **Sampling Controls:**
   - **Temperature:** Scales logit values before softmax. Lower temperatures ($T → 0$) yield focused, deterministic outputs; higher temperatures increase diversity.
   - **Top-p (Nucleus Sampling):** Restricts token selection to the smallest cumulative probability pool exceeding threshold $p$ (e.g., 0.9)."""
    },

    "computer_networks_tcp_ip": {
        "domain": "computer_science",
        "title": "Computer Networks: TCP vs. UDP & The TCP/IP Protocol Stack",
        "keywords": [
            "tcp ip", "computer network", "osi model", "tcp vs udp", "tcp", "udp", "dns", "http",
            "https", "tls", "ssl", "packet switching", "routing", "ip address", "three-way handshake"
        ],
        "content": """### Computer Networking: TCP vs. UDP & The TCP/IP Stack

Modern computer networks operate via packet-switching governed by the **TCP/IP protocol suite**. Communication is organized into standardized layers, with **TCP** and **UDP** serving as the two primary transport protocols.

---

#### 1. TCP vs. UDP Comparison

| Feature | Transmission Control Protocol (TCP) | User Datagram Protocol (UDP) |
| :--- | :--- | :--- |
| **Connection Type** | Connection-oriented (requires 3-way handshake) | Connectionless (fire-and-forget datagrams) |
| **Reliability** | Guaranteed delivery (acknowledgments & retransmits) | Best-effort (packets may drop or arrive out of order) |
| **Ordering** | Guaranteed sequential in-order delivery | No sequencing; packets arrive independently |
| **Speed & Latency** | Higher latency due to handshakes and flow control | Ultra-low latency and minimal overhead |
| **Header Size** | 20–60 bytes | 8 bytes |
| **Primary Uses** | Web (HTTP/HTTPS), File Transfer (SFTP), Email | Live Video, Voice over IP (VoIP), Online Gaming, DNS |

---

#### 2. The TCP 3-Way Handshake

Before data can be transmitted over TCP, a bidirectional session is established between client and server:

```
Client                             Server
  |                                   |
  | -------- 1. SYN (seq=x) --------> |  (Client requests connection)
  |                                   |
  | <-- 2. SYN-ACK (ack=x+1, seq=y) --|  (Server acknowledges & replies)
  |                                   |
  | -------- 3. ACK (ack=y+1) ------> |  (Client confirms acknowledgment)
  |                                   |
  | ===== CONNECTION ESTABLISHED =====|
```

- **Flow Control (Sliding Window):** Prevents a fast sender from overwhelming a slow receiver by continuously advertising available buffer space.
- **Congestion Control:** Algorithms like Cubic and BBR monitor packet latency and loss to dynamically throttle throughput and prevent network gridlock.

---

#### 3. The TCP/IP 4-Layer Architecture

1. **Application Layer (HTTP/3, DNS, SSH, SMTP):** Defines high-level protocols for user-facing applications.
2. **Transport Layer (TCP, UDP):** Manages end-to-end host-to-host process communication using port numbers.
3. **Internet Layer (IPv4, IPv6, ICMP):** Handles logical IP addressing and routes packets across heterogeneous networks.
4. **Network Interface / Link Layer (Ethernet, Wi-Fi):** Translates packets into physical frames and electrical/radio signals across local hardware."""
    },

    "databases_sql_vs_nosql": {
        "domain": "computer_science",
        "title": "Database Systems: Relational (SQL) vs. NoSQL & ACID Guarantees",
        "keywords": [
            "database", "sql vs nosql", "acid properties", "normalization",
            "b tree index", "relational database", "mongodb", "postgresql",
            "cap theorem", "sharding", "replication"
        ],
        "content": """### Database Systems: Relational (SQL) vs. NoSQL & ACID Principles

Databases are categorized into **Relational (SQL)** and **Non-Relational (NoSQL)** systems, reflecting fundamental trade-offs between transactional consistency, schema rigidity, and distributed horizontal scalability.

---

#### 1. Relational Databases (SQL) & ACID Guarantees

Relational databases (PostgreSQL, MySQL) store data in structured tables with defined schemas, relations, and foreign keys. Transactions adhere to the **ACID** framework:

- **A — Atomicity:** "All or nothing." Either every statement in a transaction executes successfully, or the entire transaction is rolled back with zero side effects.
- **C — Consistency:** Ensures data transitions strictly from one valid state to another, upholding all constraints, triggers, and referential checks.
- **I — Isolation:** Concurrent transactions execute without cross-contamination. Isolation levels range from *Read Committed* to *Serializable*.
- **D — Durability:** Once committed, changes are permanently recorded in non-volatile storage (via Write-Ahead Logging) even during sudden power failure.

---

#### 2. NoSQL Paradigms & The BASE Philosophy

NoSQL databases relax strict consistency constraints to achieve high availability and rapid horizontal scaling across distributed clusters:

- **Document Stores (MongoDB):** Store semi-structured JSON/BSON documents. Ideal for rapidly evolving schemas and nested objects.
- **Key-Value Stores (Redis, Memcached):** Lightning-fast in-memory key-value lookups; widely used for caching and session management.
- **Column-Family Stores (Apache Cassandra):** Optimized for high-throughput write workloads and massive analytical datasets across petabytes.
- **Graph Databases (Neo4j):** Store nodes and edges optimized for deep relationship traversal (social graphs, fraud detection, recommendation engines).

**The BASE Model:**
- **B**asically **A**vailable (guarantees availability).
- **S**oft state (data state may change without input due to replication).
- **E**ventual consistency (all replicas eventually converge to the same value).

---

#### 3. The CAP Theorem

In any distributed data system across an imperfect network, you can guarantee at most **two** of three properties:
- **Consistency (C):** Every read receives the most recent write.
- **Availability (A):** Every non-failing node returns a response.
- **Partition Tolerance (P):** The system continues operating despite network drops between servers.
Because network partitions are physically inevitable in distributed systems, architectures must choose between **CP** (Consistency + Partition Tolerance) and **AP** (Availability + Partition Tolerance)."""
    },

    "data_structures_core": {
        "domain": "computer_science",
        "title": "Core Data Structures: Trade-offs, Complexity & Use Cases",
        "keywords": [
            "data structure", "data structures", "linked list", "hash table", "hash map",
            "binary search tree", "bst", "heap", "priority queue", "queue", "stack",
            "avl tree", "red black tree", "trie", "graph data structure"
        ],
        "content": """### Fundamental Data Structures & Computational Complexity

A **data structure** is a specialized format for organizing, storing, and manipulating data. Selecting the optimal structure governs algorithmic time and space complexity ($O(N)$).

---

#### 1. Quick Complexity Reference

| Data Structure | Access | Search | Insertion | Deletion | Primary Strength |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Array** | O(1) | O(N) | O(N) | O(N) | Cache locality & instant index lookup |
| **Linked List** | O(N) | O(N) | O(1)* | O(1)* | Dynamic resizing with zero memory reallocations |
| **Hash Table** | N/A | O(1) avg | O(1) avg | O(1) avg | Constant-time key-value retrieval |
| **Binary Search Tree** | O(log N) | O(log N) | O(log N) | O(log N) | Ordered data retrieval & range queries |
| **Binary Heap** | O(1) (min/max) | O(N) | O(log N) | O(log N) | Priority queues & scheduling algorithms |

*(Note: Insertion/deletion for linked lists is O(1) once the node pointer is already identified).*

---

#### 2. Key Data Structures Explained

- **Hash Tables (Hash Maps):**
  Uses a mathematical **hash function** to map arbitrary keys into array indices. Collisions are handled via *Chaining* (linked lists per bucket) or *Open Addressing* (probing empty slots). When the load factor exceeds ~0.75, the table dynamically doubles in size and re-hashes.

- **Self-Balancing Trees (AVL, Red-Black Trees):**
  Standard Binary Search Trees can degenerate into an $O(N)$ linear linked list if items are inserted in sorted order. Red-Black trees perform rotational re-balancing during insertions to guarantee $O(\log N)$ worst-case performance. They underpin C++ `std::map` and Java `TreeMap`.

- **Heaps & Priority Queues:**
  A complete binary tree that maintains the **heap property**: in a Min-Heap, the root is always the smallest element. Extensively used in Dijkstra's shortest path algorithm, OS task schedulers, and heap sort."""
    },

    # =========================================================================
    # 2. CHEMISTRY & CHEMICAL SCIENCES
    # =========================================================================
    "periodic_table_and_trends": {
        "domain": "chemistry",
        "title": "The Periodic Table & Fundamental Periodic Trends",
        "keywords": [
            "periodic table", "electronegativity", "ionization energy", "atomic radius",
            "periodic trends", "electron affinity", "valence electrons", "electron configuration",
            "noble gases", "halogens", "alkali metals"
        ],
        "content": """### The Periodic Table & Fundamental Periodic Trends

The **Periodic Table** organizes all 118 known chemical elements systematically by increasing atomic number ($Z$, proton count), revealing recurring patterns in electron configuration and chemical reactivity.

---

#### 1. Structure of the Table

- **Periods (Horizontal Rows 1–7):** Correspond to the principal energy level ($n$) occupied by valence electrons.
- **Groups (Vertical Columns 1–18):** Elements possessing the same number of valence electrons, exhibiting comparable chemical properties:
  - *Group 1 (Alkali Metals):* Highly reactive metals with a single valence electron ($ns^1$).
  - *Group 17 (Halogens):* Highly electronegative non-metals needing one electron to complete an octet ($ns^2 np^5$).
  - *Group 18 (Noble Gases):* Complete valence octet ($ns^2 np^6$); chemically inert under standard conditions.

---

#### 2. The Four Primary Periodic Trends

Periodic trends stem from the balance between nuclear proton pull ($Z$) and inner electron shielding ($S$), defining the **Effective Nuclear Charge** ($Z_{eff} = Z - S$):

1. **Atomic Radius:**
   - *Decreases across a period (Left → Right):* Higher effective nuclear charge pulls the electron cloud tighter toward the nucleus.
   - *Increases down a group (Top → Bottom):* Additional electron shells are added, increasing physical distance from the nucleus.

2. **Electronegativity (Pauling Scale):**
   - Measures an atom's ability to attract shared electrons in a chemical bond.
   - *Trend:* Increases up and to the right. **Fluorine (3.98)** is the most electronegative element; **Cesium (0.79)** is among the least.

3. **Ionization Energy:**
   - The energy required to remove the outermost valence electron from a gaseous atom.
   - *Trend:* Increases across a period (electrons held more tightly); decreases down a group (outer electrons shielded and distant).

4. **Electron Affinity:**
   - The energy change that occurs when a neutral gaseous atom acquires an electron. Generally becomes more exothermic across periods toward the halogens."""
    },

    "organic_chemistry_mechanisms": {
        "domain": "chemistry",
        "title": "Organic Chemistry: SN1 vs. SN2 Reaction Mechanisms",
        "keywords": [
            "organic chemistry", "sn1", "sn2", "substitution reaction", "elimination reaction",
            "electrophile", "nucleophile", "carbocation", "functional groups",
            "carbonyl", "esterification"
        ],
        "content": """### Organic Chemistry: Nucleophilic Substitution (SN1 vs. SN2)

Nucleophilic substitution is a fundamental reaction class in organic synthesis where an electron-rich **nucleophile (Nu⁻)** replaces a **leaving group (LG)** attached to a carbon atom.

---

#### 1. SN1 vs. SN2 Comparison

| Characteristic | SN1 (Unimolecular Substitution) | SN2 (Bimolecular Substitution) |
| :--- | :--- | :--- |
| **Kinetics & Rate** | Rate = k · [Substrate] (1st order) | Rate = k · [Substrate] · [Nucleophile] (2nd order) |
| **Mechanism Steps** | 2-step process via **carbocation intermediate** | 1-step **concerted** backside attack |
| **Stereochemistry** | **Racemization** (planar carbocation attacked from either face) | **Walden Inversion** (100% stereochemical inversion like an umbrella flipping) |
| **Substrate Preference**| Tertiary (3°) > Secondary (2°) >> Primary (1°) | Methyl > Primary (1°) > Secondary (2°) >> Tertiary (3°) |
| **Nucleophile Strength**| Weak nucleophiles suffice (H₂O, alcohols) | Requires strong, charged nucleophiles (OH⁻, CN⁻, I⁻) |
| **Optimal Solvent** | Polar protic (water, ethanol) stabilizes carbocation | Polar aprotic (DMSO, acetone) keeps nucleophile unhindered |

---

#### 2. Visualizing the Mechanisms

- **The SN2 Backside Attack:**
  The nucleophile approaches the electrophilic carbon from exactly 180° opposite the leaving group. As the new bond forms, the carbon-leaving group bond breaks simultaneously. Because of this direct approach, bulky groups on tertiary carbons physically block the nucleophile (**steric hindrance**), completely preventing SN2.

- **The SN1 Two-Step Cleavage:**
  1. *Step 1 (Slow, Rate-Determining):* The leaving group departs spontaneously, forming a flat, trigonal planar **carbocation**. Tertiary carbocations are stabilized by hyperconjugation and inductive electron donation.
  2. *Step 2 (Fast):* The nucleophile attacks the flat carbocation equally from the top or bottom face, producing a racemic mixture (50/50 mix of enantiomers)."""
    },

    # =========================================================================
    # 3. BIOLOGY, GENETICS & MEDICINE
    # =========================================================================
    "cellular_respiration_and_photosynthesis": {
        "domain": "biology",
        "title": "Bioenergetics: Photosynthesis & Cellular Respiration",
        "keywords": [
            "cellular respiration", "photosynthesis", "krebs cycle", "glycolysis",
            "atp", "electron transport chain", "calvin cycle", "mitochondria",
            "fermentation", "chlorophyll", "oxidative phosphorylation"
        ],
        "content": """### Bioenergetics: Photosynthesis & Cellular Respiration

Photosynthesis and cellular respiration represent the complementary energetic cycles sustaining life on Earth: plants convert solar energy into chemical sugars, while living organisms harvest those sugars to produce **ATP (Adenosine Triphosphate)**.

---

#### 1. Photosynthesis: Capturing Solar Energy

**Overall Chemical Equation:**
```
6 CO₂ + 6 H₂O + Sunlight ───> C₆H₁₂O₆ (Glucose) + 6 O₂
```

1. **Light-Dependent Reactions (Thylakoid Membranes):**
   - Chlorophyll pigments in Photosystems II and I absorb photons, exciting electrons.
   - Water molecules are split (**photolysis**), releasing oxygen gas ($O_2$) as a byproduct while providing replacement electrons and protons ($H^+$).
   - Electron transport through the thylakoid membrane drives ATP synthase, generating **ATP** and **NADPH**.

2. **The Calvin Cycle / Light-Independent Reactions (Stroma):**
   - The enzyme **RuBisCO** fixes atmospheric $CO_2$ into organic 3-carbon sugars.
   - Using ATP and NADPH from the light reactions, these intermediates are converted into glucose ($G3P → Glucose$).

---

#### 2. Cellular Respiration: Harvesting Energy into ATP

**Overall Chemical Equation:**
```
C₆H₁₂O₆ (Glucose) + 6 O₂ ───> 6 CO₂ + 6 H₂O + ~30–32 ATP
```

1. **Glycolysis (Cytoplasm):**
   - A 10-step anaerobic pathway splitting 1 glucose (6-carbon) into 2 pyruvate molecules (3-carbon).
   - *Net Yield:* 2 ATP + 2 NADH.

2. **The Krebs Cycle / Citric Acid Cycle (Mitochondrial Matrix):**
   - Pyruvate enters the mitochondria and converts into Acetyl-CoA, producing $CO_2$.
   - The cycle oxidizes these intermediates, loading electron carriers: yielding 2 ATP, 6 NADH, and 2 FADH₂ per glucose.

3. **Oxidative Phosphorylation & The Electron Transport Chain (Inner Membrane):**
   - NADH and FADH₂ deposit high-energy electrons into membrane protein complexes.
   - As electrons cascade to oxygen ($O_2$, the final electron acceptor, forming water), protons ($H^+$) are pumped into the intermembrane space, creating a steep electrochemical gradient.
   - Protons rush back through the rotary turbine of **ATP Synthase**, generating ~26–28 ATP (chemiosmosis)."""
    },

    "immunology_and_vaccines": {
        "domain": "biology",
        "title": "Immunology: How the Immune System Fights Pathogens & Vaccines Work",
        "keywords": [
            "immune system", "immunology", "vaccine", "antibody", "antibodies",
            "t cell", "b cell", "innate immunity", "adaptive immunity", "antigen",
            "pathogen", "mrna vaccine"
        ],
        "content": """### Immunology: Innate vs. Adaptive Immunity & Vaccine Mechanisms

The human immune system is a multilayered defense network designed to recognize self from non-self, neutralize invading pathogens (viruses, bacteria, parasites), and eliminate abnormal host cells.

---

#### 1. The Two Arms of the Immune Defense

- **Innate Immunity (Immediate & Non-Specific):**
  - *Physical Barriers:* Skin, mucosal linings, stomach acid.
  - *Cellular Responders:* Neutrophils and macrophages that engulf foreign invaders through **phagocytosis**.
  - Operates within minutes to hours, responding to common microbial patterns without generating long-term memory.

- **Adaptive Immunity (Targeted & Long-Lasting Memory):**
  - High-affinity response tailored to specific molecular identifiers called **antigens**.
  - **B-Cells (Humoral Defense):** Mature in bone marrow. When activated, they differentiate into **Plasma Cells** that produce millions of antigen-specific **Antibodies (Immunoglobulins)**. Antibodies bind to pathogens, neutralizing them and tagging them for destruction.
  - **T-Cells (Cell-Mediated Defense):** Mature in the thymus:
    - *Helper T-Cells (CD4+):* The conductors of the immune response, secreting chemical cytokines to activate B-cells and macrophages.
    - *Killer / Cytotoxic T-Cells (CD8+):* Directly detect and destroy virus-infected or cancerous host cells.

---

#### 2. How Vaccines Work & Immunological Memory

Vaccines train the adaptive immune system without causing clinical illness:

1. **Antigen Exposure:** The vaccine introduces a harmless version or blueprint of a pathogen's antigen (such as an inactivated virus, recombinant protein, or mRNA encoding a spike protein).
2. **Primary Response:** The immune system recognizes the antigen as foreign, activating specific B-cells and T-cells over 7–14 days to clear it.
3. **Creation of Memory Cells:** After the antigen is eliminated, a pool of specialized **Memory B-cells and Memory T-cells** persist in lymphoid tissues for years or decades.
4. **Secondary Response (Real Exposure):** If the live pathogen ever enters the body, memory cells recognize it immediately, launching a massive, high-affinity immune counter-attack that neutralizes the virus before disease can take hold."""
    },

    # =========================================================================
    # 4. ECONOMICS, FINANCE & BUSINESS
    # =========================================================================
    "microeconomics_supply_demand": {
        "domain": "economics",
        "title": "Microeconomics: Supply, Demand & Market Equilibrium",
        "keywords": [
            "microeconomics", "supply and demand", "market equilibrium", "elasticity",
            "price elasticity", "consumer surplus", "opportunity cost", "deadweight loss",
            "monopoly", "perfect competition"
        ],
        "content": """### Microeconomics: Supply, Demand & Market Equilibrium

Microeconomics examines how individual buyers, sellers, and businesses interact in markets to determine the prices and quantities of goods and services.

---

#### 1. The Fundamental Laws

- **The Law of Demand:** All else being equal (*ceteris paribus*), as the price of a good increases, the quantity demanded by consumers decreases (downward-sloping curve). This occurs because of:
  - *The Substitution Effect:* Consumers switch to cheaper alternatives.
  - *The Income Effect:* Higher prices diminish real purchasing power.
- **The Law of Supply:** *Ceteris paribus*, as the price of a good increases, producers are willing to manufacture and sell more units (upward-sloping curve), reflecting rising marginal production costs.
- **Market Equilibrium:** The price point ($P^*$) where the quantity supplied equals the quantity demanded ($Q_s = Q_d$). At this price, the market clears with neither shortages nor surpluses.

---

#### 2. Price Elasticity of Demand (Ed)

Measures how sensitive consumer demand is to changes in price:

```
Price Elasticity = (% Change in Quantity Demanded) / (% Change in Price)
```

- **Elastic (|Ed| > 1):** Demand responds strongly to price changes (luxury items, goods with many competitors). Lowering price increases total revenue.
- **Inelastic (|Ed| < 1):** Demand changes minimally when price shifts (essential medicines, fuel, water). Raising price increases total revenue.

---

#### 3. Market Surpluses & Deadweight Loss

- **Consumer Surplus:** The monetary benefit consumers gain when they purchase a product for less than the maximum price they were willing to pay.
- **Producer Surplus:** The benefit producers receive when selling at a market price higher than their marginal cost of production.
- **Deadweight Loss:** The loss in total economic efficiency and welfare that occurs when taxes, tariffs, monopolies, or price controls (caps/floors) prevent the market from reaching equilibrium."""
    },

    "macroeconomics_gdp_inflation_monetary": {
        "domain": "economics",
        "title": "Macroeconomics: GDP, Inflation & Central Bank Monetary Policy",
        "keywords": [
            "macroeconomics", "gdp", "inflation", "monetary policy", "fiscal policy",
            "interest rates", "central bank", "federal reserve", "cpi", "recession",
            "unemployment", "quantitative easing"
        ],
        "content": """### Macroeconomics: Economic Output (GDP), Inflation & Interest Rates

Macroeconomics examines broad national and global economic trends, focusing on economic growth, price stability, employment, and governmental stabilization policies.

---

#### 1. Gross Domestic Product (GDP)

GDP measures the total monetary value of all finished goods and services produced within a nation over a given period. It is calculated via the **Expenditure Formula**:

```
GDP = C + I + G + (X - M)
```

- **C (Consumption):** Household spending on goods and services (~60–70% of modern economies).
- **I (Investment):** Business capital expenditures, commercial/residential real estate, and inventories.
- **G (Government Spending):** Infrastructure, public salaries, and defense.
- **(X - M) (Net Exports):** Exports minus Imports.

*Nominal GDP* measures output in current prices; *Real GDP* strips out inflation to measure true volume growth.

---

#### 2. Understanding Inflation

Inflation represents a broad, sustained increase in the overall price level, eroding currency purchasing power:
- **Demand-Pull Inflation:** Aggregate consumer demand outstrips the economy's productive capacity ("too much money chasing too few goods").
- **Cost-Push Inflation:** Supply chain disruptions or surging commodity costs (e.g., oil spikes) raise production expenses, forcing prices upward.
- **Measurement:** Tracked primarily via the **Consumer Price Index (CPI)**, which monitors price changes across a standard basket of household goods and services.

---

#### 3. Central Banks & Monetary Policy

Central banks (such as the Federal Reserve, ECB, or RBI) manage economic stability primarily by adjusting benchmark interest rates:

- **Fighting High Inflation (Tight / Contractionary Policy):**
  The central bank **raises interest rates**. Borrowing becomes more expensive for homes, cars, and business expansion, cooling consumer demand and slowing price increases.
- **Fighting Recessions (Loose / Expansionary Policy):**
  The central bank **lowers interest rates**. Cheaper credit stimulates borrowing, hiring, and capital investment to reignite economic activity."""
    },

    "finance_compound_interest_and_investing": {
        "domain": "economics",
        "title": "Financial Mathematics: Compound Interest & Time Value of Money",
        "keywords": [
            "compound interest", "time value of money", "finance", "present value",
            "future value", "stock market", "npv", "dcf", "bonds", "investing",
            "portfolio", "risk and return"
        ],
        "content": """### Financial Mathematics: Compound Interest & Time Value of Money

The foundational principle of finance is the **Time Value of Money**: a dollar today is worth more than a dollar received in the future because of its potential earning capacity.

---

#### 1. The Compound Interest Formula

Unlike simple interest (which only earns interest on the original deposit), **compound interest** earns interest on both the initial principal and accumulated past interest:

```
A = P × (1 + r/n)^(n × t)
```

- **A:** Final accumulated amount.
- **P:** Starting principal investment.
- **r:** Annual nominal interest rate (decimal).
- **n:** Compounding frequency per year (12 for monthly, 365 for daily).
- **t:** Number of years.

**The Rule of 72 (Mental Shortcut):**
To estimate how many years it takes for an investment to double at annual rate $r\%$:
```
Years to Double ≈ 72 / Rate
```
*(Example: At an 8% annual return, money doubles in approximately 72 / 8 = 9 years).*

---

#### 2. Present Value & Net Present Value (NPV)

To determine what future cash flows are worth in today's money, they are discounted back using a discount rate $r$:

```
Present Value = Future Value / (1 + r)^t
```

- **Net Present Value (NPV):** The gold standard for business investment decisions. Subtracts the initial project cost from the sum of all discounted future cash flows:
  - **NPV > 0:** The investment creates economic value and should be approved.
  - **NPV < 0:** The investment destroys value compared to alternative opportunities."""
    },

    # =========================================================================
    # 5. APPLIED SCIENCE & HOW THINGS WORK
    # =========================================================================
    "how_airplanes_fly_aerodynamics": {
        "domain": "applied_science",
        "title": "Aerodynamics: How Airplanes Generate Lift & Fly",
        "keywords": [
            "airplane", "how airplanes fly", "aerodynamics", "lift and drag", "airfoil",
            "flight mechanics", "bernoulli airplane", "jet engine", "turbofan",
            "angle of attack"
        ],
        "content": """### Aerodynamics: The Physics of Flight & Lift Generation

An airplane maintains steady, level flight when four fundamental forces reach dynamic equilibrium:

```
        Lift  ▲
              │
Drag ◄────────┼────────► Thrust
              │
              ▼  Weight (Gravity)
```

- **Lift = Weight:** Upward aerodynamic wing force balances gravity.
- **Thrust = Drag:** Forward engine propulsion equals aerodynamic air resistance.

---

#### 1. How Wings Actually Generate Lift

Aerodynamic lift is produced through the coordinated interaction of **Newton's Third Law of Motion** and the **Bernoulli Principle**:

1. **Downwash & Newton's Third Law (Action and Reaction):**
   An airplane wing (airfoil) is mounted at a slight positive **Angle of Attack** relative to incoming air. As the plane moves forward, the wing continuously deflects massive volumes of air downwards. By Newton's Third Law, forcing air downward produces an equal and opposite upward reaction force on the aircraft.

2. **Streamline Curvature & Bernoulli's Pressure Differential:**
   Because of the wing's curved upper surface and the Coandă effect, air flowing over the top must turn and accelerate along the contour. Per Bernoulli's principle, faster-moving fluid exerts lower static pressure. This creates a net suction zone (low pressure) above the wing and higher pressure underneath, sucking the wing upward.

---

#### 2. Flight Controls

Pilots control flight along three primary rotational axes:
- **Roll (Wings Bank Left/Right):** Controlled by **Ailerons** on the outer wing edges moving in opposite directions.
- **Pitch (Nose Up/Down):** Controlled by **Elevators** on the horizontal tail stabilizer.
- **Yaw (Nose Left/Right):** Controlled by the **Rudder** on the vertical tail fin."""
    },

    "how_gps_and_internet_work": {
        "domain": "applied_science",
        "title": "Global Technology: How GPS Satellite Navigation Works",
        "keywords": [
            "gps", "how gps works", "how internet works", "undersea cables",
            "trilateration", "fiber optic", "satellite navigation", "atomic clock",
            "relativity in gps"
        ],
        "content": """### Global Infrastructure: How GPS Navigation & Trilateration Work

The **Global Positioning System (GPS)** is a satellite-based radio navigation system capable of pinpointing a receiver's position anywhere on Earth to within centimeters.

---

#### 1. How Trilateration Works

The GPS constellation maintains 31 satellites orbiting at an altitude of ~20,200 km:

1. **Atomic Time Broadcasting:** Each satellite continuously broadcasts radio signals encoding its precise orbital position and the exact nanosecond-accurate timestamp from on-board atomic clocks.
2. **Distance Calculation:** A smartphone receiver measures the tiny travel time delay between signal broadcast and arrival. Multiplying by the speed of light ($c = 300,000\text{ km/s}$) gives the distance to that satellite:
   ```
   Distance = Speed of Light × Time Delay
   ```
3. **Four-Satellite Intersection:**
   - 1 Satellite narrows position to a sphere.
   - 2 Satellites narrow position to a circle where two spheres intersect.
   - 3 Satellites pinpoint two points on Earth.
   - **4 Satellites** resolve the exact 3D coordinates (Latitude, Longitude, Altitude) and synchronize the phone's inexpensive internal clock with atomic time.

---

#### 2. Einstein's Relativity in Everyday GPS

Without applying Albert Einstein's theories of relativity, GPS navigation would drift by over **11 kilometers per day**:
- **Special Relativity (Speed):** Satellites orbit at ~14,000 km/h, causing satellite clocks to tick **7 microseconds/day slower** due to velocity time dilation.
- **General Relativity (Gravity):** Satellites reside in weaker Earth gravity, causing satellite clocks to tick **45 microseconds/day faster** due to gravitational blueshift.
- **Net Relativistic Correction:** Satellite clocks tick **~38 microseconds/day faster** than Earth clocks, and satellite hardware is pre-calibrated to compensate for this exact delta."""
    }
}


def find_universal_topic(prompt: str) -> Optional[Dict[str, Any]]:
    """
    Searches the universal knowledge base for a matching topic.
    Uses regex word boundaries for acronyms and keywords.
    """
    p_lower = prompt.lower()
    best_match = None
    max_kw_hits = 0

    for topic_id, topic_data in UNIVERSAL_TOPICS.items():
        hits = 0
        for kw in topic_data["keywords"]:
            if len(kw) <= 4:
                if re.search(r'\b' + re.escape(kw) + r'\b', p_lower):
                    hits += 2
            else:
                if kw in p_lower:
                    hits += 1
        if hits > max_kw_hits and hits >= 1:
            max_kw_hits = hits
            best_match = topic_data

    if best_match and max_kw_hits >= 1:
        return best_match
    return None
