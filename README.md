# Nityam  
**Knowledge-to-Workflow Engine for Government Policies**  
**2nd Place – GEC Coders' Club Hack Day**  

Devpost: https://gec-coders-club-hack-day.devpost.com/

---

## Overview

**Nityam** is an AI-powered system that converts unstructured government policy documents into structured, actionable, and verifiable workflow systems.

It bridges the gap between policy documentation and real-world execution by transforming legal text into:

- Step-by-step workflows  
- Decision trees  
- Operational checklists  
- Rule-based validation systems  

---

## Problem Statement

### Main Problem  
Government policy documents are written in unstructured legal language. Field implementation requires structured, executable workflows.

Build a system that converts policy documents into:
- Step-by-step workflows  
- Decision trees  
- Operational checklists for field officers  

### Sub Problem  
- Extract entities, conditions, and rules  
- Generate a workflow graph (nodes + transitions)  
- Implement a rule engine to validate whether a given case complies with policy  

---

## Core Features (Aligned to the PS)

### 1. Policy-to-Workflow Conversion

- Accepts raw policy text (paste or upload)
- Supports `.txt`, `.pdf`, and `.docx`
- Extracts structured components from legal language
- Generates:
  - Ordered workflow steps
  - Conditional branches
  - Decision checkpoints
  - Required documents
  - Operational actions

Produces a structured workflow model derived directly from policy text.

---

### 2. Entity & Rule Extraction

Automatically extracts:

**Entities**
- Applicant attributes  
- Officer roles  
- Documents  
- Numeric thresholds  
- Boolean conditions  

**Rules**
- Eligibility criteria  
- Mandatory procedural steps  
- Conditional approvals  
- Rejection conditions  

Creates a machine-readable policy schema.

---

### 3. Workflow Graph Generation

Transforms extracted logic into:

- Nodes (actions / verifications)
- Transitions (conditional flows)
- Decision points
- SLA-linked stages

Produces a structured workflow representation aligned with execution paths.

---

### 4. Operational Checklists

Generates:

- Required documents checklist
- Verification action checklist
- Step-by-step operational instructions

Checklists are interactive and persist per workflow.

---

### 5. Risk, Ambiguity & Gap Detection

Automatically identifies:

- Decision points
- Risk factors
- Policy ambiguities
- Compliance gaps

Also provides:

- Risk level classification  
- Complexity scoring  
- Operational impact indicators  

---

### 6. Rule Validation Engine

Includes structured validation capability:

- Auto-generated case input form from extracted entities
- Submission of real-world case data
- Execution of compiled policy rules
- Output showing:
  - Compliance status
  - Violated conditions
  - Policy reasoning

Enables verification of whether a case follows policy requirements.

---

### 7. Dual Output Modes

**Officer Mode**
- Full workflow visualization
- Decision logic
- Risk and compliance insights
- Operational metrics

**Citizen Mode**
- Simplified instructions
- Required document guidance
- Clear procedural flow

---

## Architecture

### Frontend
- Next.js  
- TypeScript  

### AI Layer
- Gemini API for structured extraction and reasoning  

### Backend
- `/api/gemini` – workflow generation  
- `/api/validate` – rule validation  
- Supabase – authentication and data storage  

### Document Processing
- PDF parsing  
- DOCX extraction  
- Plain text ingestion  

---

## How It Works

1. Upload or paste a government policy document.  
2. The system extracts entities, conditions, and rules.  
3. A structured workflow graph is generated.  
4. Operational checklists and decision logic are derived.  
5. In validation mode:
   - Case data is submitted.
   - The rule engine evaluates compliance.
   - The system determines whether the case follows policy.

---

