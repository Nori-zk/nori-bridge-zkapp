# Simple High-Level Flow Diagrams

## BridgeMachine - What It Does

**Purpose:** Tells the UI what stage the overall bridge system is in.

```mermaid
graph LR
    A[Listen to Bridge WebSocket] --> B{What stage is<br/>bridge in?}
    B --> C[Update UI:<br/>'Waiting for finality']
    B --> D[Update UI:<br/>'Processing deposits']
    B --> E[Update UI:<br/>'Ready to mint']
    B --> F[Update UI:<br/>'Other stage...']

    C --> A
    D --> A
    E --> A
    F --> A

    style A fill:#e1f5ff
    style B fill:#fff4e1
```

**That's it!** It just mirrors the bridge state to your UI.

---

## DepositMintMachine - User Journey (Happy Path)

```mermaid
graph TD
    START([User arrives at app]) --> STEP1[1. App loads,<br/>checks localStorage]

    STEP1 --> STEP2[2. User locks ETH<br/>on Ethereum]

    STEP2 --> STEP3[3. User enters<br/>deposit block number]

    STEP3 --> CHECK{Does user need<br/>to setup storage?}

    CHECK -->|Yes| STEP4A[4a. Build storage tx]
    STEP4A --> STEP4B[4b. User signs & submits]
    STEP4B --> STEP4C[4c. Wait for tx to finalize]
    STEP4C --> STEP5

    CHECK -->|No| STEP5[5. Monitor deposit status<br/>Wait for compute window]

    STEP5 --> STEP6[6. Compute ETH proof<br/>Heavy worker task]

    STEP6 --> STEP7[7. Wait for mint window]

    STEP7 --> STEP8[8. Build mint transaction<br/>Heavy worker task]

    STEP8 --> STEP9[9. User signs & submits<br/>mint tx]

    STEP9 --> END([Success! nETH minted 🎉])

    style START fill:#e1ffe1
    style END fill:#e1ffe1
    style STEP4B fill:#ffe1e1
    style STEP9 fill:#ffe1e1
    style CHECK fill:#fff4e1
```

---

## What Happens at Each Step

### Step 1: App Loads
- Checks localStorage for any in-progress deposit
- If found, resumes from where user left off

### Step 2: User Locks ETH
- User interacts with Ethereum contract (outside this machine)
- Gets a deposit block number

### Step 3: Enter Deposit Number
- User tells the machine which deposit to track
- Machine starts monitoring that deposit

### Step 4: Storage Setup (Only if needed)
**4a. Build Transaction**
- Worker compiles contracts
- Creates a setup transaction

**4b. User Signs**
- Wallet pops up (Auro wallet for Mina)
- User approves transaction

**4c. Wait for Finalization**
- Machine polls blockchain until confirmed
- Usually takes a few minutes

### Step 5: Monitor Deposit
- Machine watches bridge status
- Waiting for Ethereum finality (13+ minutes)
- Then waiting for deposit to be processed

### Step 6: Compute ETH Proof
- Heavy cryptographic computation
- Runs in background worker (so UI doesn't freeze)
- Proof saved to localStorage

### Step 7: Wait for Mint Window
- Bridge has specific timing windows
- Machine waits until "ReadyToMint" signal

### Step 8: Build Mint Transaction
- Worker builds the final minting transaction
- Includes the ETH proof from step 6

### Step 9: Submit Mint
- User signs transaction with wallet
- Transaction submitted to Mina blockchain
- Success! User now has nETH

---

## What Can Go Wrong (Error Handling)

```mermaid
graph TD
    ERROR[Error Occurs] --> LOG[Log error to console]
    LOG --> SAVE[Save error message<br/>for UI to display]
    SAVE --> WAIT[Wait 8 seconds]
    WAIT --> RETRY[Retry from<br/>last good state]

    RETRY --> SUCCESS{Retry<br/>successful?}
    SUCCESS -->|Yes| CONTINUE[Continue flow]
    SUCCESS -->|No| ERROR

    style ERROR fill:#ffcccc
    style CONTINUE fill:#e1ffe1
```

**Error Recovery:**
- Machine automatically retries after 8 seconds
- All progress saved to localStorage
- User can refresh page - flow resumes

---

## The Storage Setup Flow (Detailed)

```mermaid
graph TD
    START[Storage needed?] --> CHECK[Check blockchain:<br/>Is storage already setup?]

    CHECK -->|Yes| SKIP[Skip setup,<br/>continue to monitoring]

    CHECK -->|No| BUILD[Build setup transaction]

    BUILD --> SIGN[User signs transaction]

    SIGN -->|User cancels| BUILD

    SIGN -->|User approves| SUBMIT[Submit to blockchain]

    SUBMIT --> POLL[Poll blockchain every few seconds]

    POLL --> FINALIZED{Transaction<br/>finalized?}

    FINALIZED -->|Not yet| POLL
    FINALIZED -->|Yes| DONE[Mark as complete,<br/>continue to monitoring]

    style START fill:#fff4e1
    style SIGN fill:#ffe1e1
    style DONE fill:#e1ffe1
```

---

## Key Takeaways

### BridgeMachine
- **Super simple**: Just monitors bridge state
- **No user interaction**: Fully automatic
- **Updates UI**: Shows global bridge status

### DepositMintMachine
- **Complex flow**: 9 main steps for user
- **2 user interactions**: Sign storage setup (maybe), sign mint tx (always)
- **Automatic retry**: Errors handled gracefully
- **Resumable**: Can refresh page anytime

### Both Together
```
┌─────────────────────────────────────┐
│  BridgeMachine (Global)             │
│  "Bridge is processing deposits"    │ ← Background info
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  DepositMintMachine (Your Deposit)  │
│  Step 5 of 9: Monitoring deposit... │ ← Your progress
│  [Progress bar: 55%]                 │
└─────────────────────────────────────┘
```

---

## Simplification Opportunities

### Current: 17 states
```
hydrating → checking → noActiveDepositNumber → hasActiveDepositNumber →
needsToCheckSetup → setupStorageOnChainCheck → setupStorage →
submitSetupStorageTx → waitForStorageSetupFinalization →
monitoringDepositStatus → computeEthProof → hasComputedEthProof →
buildingMintTx → submittingMintTx → (checkingDelay) →
(completed/missedOpportunity)
```

### Proposed: 9 states
```
init → enterDeposit → setupStorage → monitoring →
computingProof → buildingTx → submitting → completed
(+ error state)
```

**Why so many states currently?**
- Storage setup broken into 5 states (could be 1-2)
- Separate "has proof" waiting state (could combine with building)
- Checking and hydrating separate (could combine)
- Error delay as its own state (could be a timer in error state)

The core user flow is really just **9 steps**, but the implementation uses **17 states** to manage all the edge cases and persistence.
