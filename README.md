# ORCA — Multimodal Underwater Intelligence Platform

**Intelligent Underwater Inspection & Anomaly-Analysis Platform Connecting Sonar, Hardware Sensing, Specialist AI, and Operator Decision Support**  
*(Smart India Hackathon 2026 — Problem Statement SIH26057)*

---

## 1. Hero / Overview

**ORCA** is an intelligent underwater inspection and anomaly-analysis platform that connects sonar and hardware-acquired sensing data with specialist AI models, automatic model routing, operational intelligence, geospatial visualization, expert verification, and structured reporting.

Rather than forcing an unwieldy, single-detector architecture across radically disparate physical imaging domains, ORCA bridges the entire operational workflow from raw field data to high-level decision support:

$$\text{Field Data} \longrightarrow \text{AI Analysis} \longrightarrow \text{Intelligence} \longrightarrow \text{Operator Verification} \longrightarrow \text{Geospatial / Operational View} \longrightarrow \text{Report}$$

```mermaid
flowchart LR
    A["🌊 Field Sensing Data\n(Sonar / Optical / Hardware)"] --> B["⚡ FastAPI Ingestion\n& Quality Assessment"]
    B --> C["🧠 Automatic Domain Router\n& Specialist YOLOv8n"]
    C --> D["🎯 Detection Intelligence\n& Prioritization Layer"]
    D --> E["👤 Human-in-the-Loop\nExpert Verification"]
    E --> F["🗺️ Geospatial Mapping\n& Operational Reports"]
```

> [!IMPORTANT]
> **Operational Role**: ORCA is built to assist operators, maritime engineers, and subsea domain experts. It does not replace human oversight or make autonomous operational interventions. All automated predictions flow through a human-in-the-loop verification pipeline before final report commitment.

---

## 2. What ORCA Does

ORCA delivers an end-to-end operational software platform designed for subsea survey teams, autonomous underwater vehicles (AUVs), remotely operated vehicles (ROVs), and shore-side command centers:

1. **Multi-Domain Underwater Image Analysis**: Ingests acoustic side-scan sonar waterfall imagery (`.pbm`, `.bpm`), submerged optical photography, and edge hardware imagery.
2. **Automatic Specialist-Model Routing**: Analyzes 17 visual invariant features in real time to automatically select the optimal domain specialist without manual intervention.
3. **Pipeline Detection**: Identifies exposed conduits, subsea infrastructure, and structural pipeline defects in high-aspect sonar waterfalls.
4. **Human-Target Detection**: Detects divers, submerged personnel, and human activity in underwater optical and acoustic scenes.
5. **Hardware-Object Detection**: Catalogues mission tools, equipment, and recovery targets (`cap`, `clip`, `key`, `niddle`, `scissor`).
6. **Hardware Data Ingestion**: Receives synchronized sensor frames and sonar distance data from field acquisition units over network APIs.
7. **Detection Confidence & Bounding-Box Evidence**: Provides spatial bounding boxes, class labels, and detection confidence telemetry for each anomaly.
8. **Detection Intelligence & Prioritization**: Organizes raw detections into operational hazard contexts, location risk, severity scores, and recommended actions.
9. **Expert Confirmation / Rejection / Review**: Delivers a full human-in-the-loop review workflow (`Confirm`, `Reject`, `Review`) for audit accountability.
10. **Geospatial Anomaly Visualization**: Plots verified detections onto interactive Leaflet maritime bathymetry charts for spatial awareness.
11. **Scan History**: Retains historical scan records, operator review statuses, and detection metrics for side-by-side comparative analysis.
12. **Structured Reports & PDF Export**: Produces standardized operational mission reports with PDF generation, CSV exports, and raw JSON schemas.
13. **Dataset Lab for Model Adaptation**: Provides a structured 6-stage workflow for validating new annotated datasets and creating domain specialist candidates.
14. **API-First Backend**: High-performance FastAPI asynchronous microservice architecture.
15. **Swagger / OpenAPI Interface**: Full interactive API documentation and testing workbench at `/docs`.
16. **Cloud-Ready Architecture**: Modular microservice design decoupled for local edge operation or remote shore-side cloud deployment.

---

## 3. Complete ORCA Workflow

The diagram below illustrates the end-to-end dataflow across sensing, automated routing, specialist neural networks, decision-support intelligence, and reporting:

```mermaid
flowchart TD
    subgraph IngestionStage["1. Field Ingestion & Quality Analysis"]
        A["Field / Sonar / Hardware Data"] --> B["Image + Sensor Data Ingestion"]
        B --> C["Image Quality / Analysis Pipeline\n(10 Expandable Acoustic Substeps)"]
    end

    subgraph RoutingStage["2. Visual Domain Routing"]
        C --> D["Automatic Domain Router\n(17 Visual Invariant Features + Degeneracy Gate)"]
        D --> E{"Domain Classification\n(Confidence p >= 0.85?)"}
        E -- "Yes" --> F["Select Specialist AI Model\n(Pipeline / Human / Hardware YOLOv8n)"]
        E -- "Uncertain / Degenerate" --> Degen["Operator Manual Target Override"]
        Degen --> F
    end

    subgraph InferenceStage["3. Specialist Inference & Evidence"]
        F --> G["Execute Specialist YOLOv8n\n(Bounding Boxes + Confidence Telemetry)"]
    end

    subgraph DecisionSupport["4. Tactical Intelligence & Verification"]
        G --> H["Detection Intelligence Layer\n(Context, Location Risk, Priority 0-100)"]
        H --> I["Priority & Tactical Action Order"]
        I --> J["Human Expert Verification\n(Confirm / Reject / Review)"]
    end

    subgraph OperationalOutputs["5. Geospatial Mapping & Reporting"]
        J --> K["Geospatial Visualization\n(Maritime Hydrographic Bathymetry Chart)"]
        K --> L["History & Structured Mission Reports\n(Client-Side PDF / CSV / JSON)"]
        L --> M["Operational Decision Support"]
    end
```

Automatic model routing intelligently chooses the appropriate specialist model based on visual invariants, ensuring that raw pixels are evaluated only by the model trained on that specific domain.

---

## 4. Specialist AI Architecture

A central engineering principle of ORCA is **semantic class isolation**. Forcing acoustic sonar imagery, submerged human optical photography, and close-up hardware tools into a single merged detector causes cross-domain feature interference, false positive clutter, and degraded performance. ORCA intentionally deploys **three dedicated specialist models**:

```mermaid
flowchart TD
    subgraph Domains["Incoming Sensing Streams"]
        D1["Side-Scan Sonar Waterfall\n(.pbm, .bpm Netpbm formats)"]
        D2["Subsea Optical Photography\n(Diver & Swimmer Imagery)"]
        D3["ROV Edge Hardware Imagery\n(Close-up Tool & Equipment Feeds)"]
    end

    subgraph Specialists["Isolated Specialist Neural Networks"]
        M1["Pipeline Specialist (YOLOv8n)\nWeights: models/pipeline/best.pt\nTarget: Subsea Conduits & Pipelines"]
        M2["Human Specialist (YOLOv8n)\nWeights: models/human/best.pt\nTarget: Submerged Human / Diver"]
        M3["Hardware Specialist (YOLOv8n)\nWeights: models/hardware/best.pt\nTargets: cap, clip, key, niddle, scissor"]
    end

    subgraph Outputs["Target-Aware Operational Outputs"]
        O1["Pipeline Exposure / Structural Defect"]
        O2["Diver / Personnel Search & Rescue Target"]
        O3["Subsea Equipment Recovery & Salvage Target"]
    end

    D1 ==> M1 ==> O1
    D2 ==> M2 ==> O2
    D3 ==> M3 ==> O3
```

| Specialist Model | Target Domain | Architecture | Detected Classes | Frozen Checkpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Pipeline Specialist** | Subsea Pipeline Sonar | YOLOv8n (5.93 MiB) | `Pipeline` | [`models/pipeline/best.pt`](models/pipeline/best.pt) |
| **Human Specialist** | Subsea Diver / Human | YOLOv8n (5.94 MiB) | `Human` | [`models/human/best.pt`](models/human/best.pt) |
| **Hardware Specialist** | Edge Hardware / Recovery | YOLOv8n (5.96 MiB) | `cap`, `clip`, `key`, `niddle`, `scissor` | [`models/hardware/best.pt`](models/hardware/best.pt) |

### Pipeline Specialist
Trained specifically for infrastructure inspection on high-aspect-ratio side-scan sonar waterfall imagery using the validated SubPipeMiniSSS dataset. It accurately identifies seabed pipeline runs, conduit exposure, and structural anomalies amid seabed reverberation.

### Human Specialist
Trained as a dedicated human-target detector on subsea diver and underwater human activity imagery derived from the AquaScan supervised dataset. It provides critical search-and-rescue and diver monitoring capability in optical and acoustic regimes.

### Hardware Specialist
Trained for hardware-domain object detection and recovery operations using the hardware dataset. It detects five discrete tool and hardware classes: `cap`, `clip`, `key`, `niddle` (needle), and `scissor`.

> [!NOTE]
> These specialist models are maintained as independent, frozen checkpoints and are never bundled into an unjustified universal weight file.

---

## 5. Automatic Model Routing

ORCA incorporates an intelligent, lightweight visual domain router that inspects incoming imagery and automatically invokes the matching specialist model in under 15 milliseconds—without running deep neural network inference:

```mermaid
flowchart TD
    Start["Incoming Sensor Frame"] --> FE["Extract 17 Visual Invariant Features\n(Color Variance, Saturation, Dynamic Range, Sobel/Laplacian Gradients, Entropy)"]
    FE --> Scaler["StandardScaler Normalization\n(scaler.joblib)"]
    Scaler --> LR["Multinomial Logistic Regression\n(logistic_router.joblib)"]
    LR --> DegenCheck{"Degeneracy Gate\n(Blank, Flat-Grey, or Corrupt?)"}

    DegenCheck -- "Yes (Degenerate)" --> AbstainDegen["UNCERTAIN State\n(degenerate_image)"]
    DegenCheck -- "No (Valid Frame)" --> ConfGate{"Domain Confidence\np >= 0.85 ?"}

    ConfGate -- "Yes (p >= 0.85)" --> AutoDispatch["Automatic Specialist Invocation"]
    AutoDispatch --> M1["Pipeline Specialist YOLO"]
    AutoDispatch --> M2["Human Specialist YOLO"]
    AutoDispatch --> M3["Hardware Specialist YOLO"]

    ConfGate -- "No (p < 0.85)" --> AbstainLow["UNCERTAIN State\n(Router Abstains)"]
    AbstainLow --> ManualSelect["Operator Manual Target Override\n(pipeline | human | hardware)"]
    AbstainDegen --> ManualSelect
```

$$\text{Uploaded Image} \longrightarrow \text{17 Visual Features} \longrightarrow \text{StandardScaler} \longrightarrow \text{Logistic Regression} \longrightarrow \text{Domain Confidence} \longrightarrow \text{Threshold / Degeneracy Gate} \longrightarrow \text{Specialist YOLO}$$

### Router Architecture & Mechanics
1. **17 Visual Invariant Features**: Computes statistical visual invariants across dimensions:
   - *Color & Saturation Distribution*: HSV saturation mean, saturation standard deviation, channel intensity balance.
   - *Dynamic Range & Contrast*: Dynamic pixel range, intensity variance, dark pixel ratio, bright pixel ratio.
   - *Spatial & Frequency Gradients*: Laplacian edge variance, horizontal and vertical Sobel gradient energy, gradient ratio.
   - *Information Entropy*: Shannon entropy across luminance histograms.
2. **StandardScaler Normalization**: Centers and scales the 17-dimensional vector using pre-fitted parameters stored in [`scaler.joblib`](backend/app/router_artifacts/scaler.joblib).
3. **Multinomial Logistic Regression**: Evaluates domain class probabilities via regularized weights in [`logistic_router.joblib`](backend/app/router_artifacts/logistic_router.joblib).
4. **Degeneracy Gate**: Instantly intercepts all-black, flat-grey, overexposed, or corrupt images and marks them as `uncertain` (`degenerate_image`), preventing false inferences on invalid sensor pings.
5. **Confidence Threshold ($\tau = 0.85$)**: If the predicted domain confidence is below 85%, the router **abstains** rather than blindly selecting a specialist. The system marks the frame as `uncertain` and prompts the operator for manual disambiguation.
6. **Manual Target Routing**: Operators retain the ability to manually force any target specialist (`pipeline`, `human`, or `hardware`) via the UI or API, bypassing automatic routing when operational context is already known.

*(Note: Raw model probabilities are decision thresholds and are not described as mathematically calibrated posterior probabilities.)*

---

## 6. Detection Workspace

The **Detection Workspace** (`#/detections` and `#/analyze`) serves as the operator's primary tactical analysis console:

- **Image Ingestion**: Drag-and-drop or file upload supporting Netpbm binary sonar (`.pbm`, `.bpm`), `.png`, and `.jpg`.
- **Automatic or Manual Model Selection**: Toggle between one-click auto-routing and explicit specialist assignment.
- **Real Model Inference**: Executes real inference against local YOLOv8n checkpoints via FastAPI.
- **Bounding Boxes & Class Labels**: Renders visual bounding boxes, class identifiers, and detection confidence directly over the sensor image.
- **Inspection Viewport**: Pan, zoom, and pixel-level inspection tools for high-resolution acoustic sonar frames.
- **Evidence Telemetry**: Displays bounding box coordinates, relative dimensions, aspect ratios, and confidence scores.
- **Integrated Prioritization**: Direct linkage to the detection intelligence layer.
- **Expert Review Controls**: Inline verification controls enabling operators to confirm or reject detections in place.

---

## 7. Detection Intelligence & Prioritization

ORCA bridges the gap between raw neural network outputs and operational decision-making. In the field, an operator does not just need to know that an object exists; they need to know what action to take:

```mermaid
flowchart LR
    subgraph ModelOutput["Raw Model Inference"]
        Det["Bounding Box Coordinates\nClass Label\nConfidence Score (0-1)"]
    end

    subgraph IntelEngine["Operational Intelligence Layer"]
        Haz["Hazard Assessment\n(Very High / High / Medium / Context)"]
        Loc["Location Risk Mapping\n(High / Medium / Context-Based)"]
        Prio["Priority Score (0-100)\n& Severity Tier (CRITICAL / HIGH / MED / LOW)"]
        Act["Recommended Tactical Action\n(e.g., 'Inspect / Assess Immediately')"]
    end

    subgraph OpsQueue["Tactical Execution Queue"]
        Queue["Cleanup / Inspection Order\n(Ranked Work Order for ROV / Divers)"]
    end

    Det --> Haz --> Prio
    Det --> Loc --> Prio
    Prio --> Act --> Queue
```

$$\text{Object} \longrightarrow \text{Confidence} \longrightarrow \text{Hazard} \longrightarrow \text{Location Risk} \longrightarrow \text{Priority (0--100)} \longrightarrow \text{Recommended Action} \longrightarrow \text{Cleanup / Inspection Order}$$

### Structured Decision-Support Layer
ORCA provides a structured prioritization interface that organizes detection evidence into hazard context, location risk, priority and recommended action fields. The current intelligence layer is designed as a replaceable decision-support layer so future domain-specific risk models can be integrated without changing the core detection architecture.

### Operational Context Mapping
- **Pipeline Domain**: High-hazard context. A pipeline detection with high confidence indicates potential infrastructure exposure or structural anomaly, prompting immediate priority scoring (e.g. Priority 92/100, `CRITICAL`) and recommended actions such as `Inspect / Assess Immediately`.
- **Human Domain**: Context-dependent hazard. Divers or human activity represent critical safety and search-and-rescue context, triggering operator review actions (`Operator Review`) rather than asset cleanup.
- **Hardware Domain**: Subsea debris, dropped tools, or lost equipment. Categorized for salvage or clearance (e.g. `Inspect / Retrieve Obstruction` for scissors; `Cautious Retrieval Required` for needles; `Inspect / Remove if Confirmed` for clips).

---

## 8. Human-in-the-Loop Expert Review

AI detections in maritime and subsea infrastructure must never be acted upon blindly. ORCA embeds a strict human-in-the-loop review workflow for every identified anomaly:

```mermaid
stateDiagram-v2
    [*] --> Pending: AI Model Detection Ingested
    Pending --> Confirmed: Operator Validates (Authentic Target)
    Pending --> Rejected: Operator Flags (Acoustic Noise / Clutter)
    Pending --> ReviewRequired: Operator Defers (Secondary Pass Needed)
    Confirmed --> AuditReport: Synchronized into Mission Report & Audit Log
    Rejected --> AuditReport: Preserved in Review Audit Trail
    ReviewRequired --> AuditReport: Flagged in Tactical Inspection Queue
```

- **Confirm**: The operator or marine specialist validates that the detection is an authentic target.
- **Reject**: The operator flags the detection as acoustic clutter, seabed reverberation, or a false positive.
- **Review**: The anomaly is tagged as requiring further multi-pass acoustic inspection or secondary sensor verification.

This review state is tracked in application memory and local storage, displayed on mission reports, and preserved in scan history. In future iterations, verified operator feedback can form curated active-learning datasets for supervised fine-tuning.

---

## 9. Mission Overview Dashboard

The **Mission Overview** (`#/dashboard`) provides operational managers and mission commanders with immediate situational awareness:

- **Core Capabilities Bar**: Highlights ORCA's foundational pillars:
  1. *Multimodal AI Intelligence*
  2. *Reliable Detection & Classification*
  3. *Geospatial Intelligence*
  4. *Automated Analysis & Reporting*
- **Real-Time KPI Metrics**:
  - `Scans Analyzed`: Total scan inventory retained in local operator storage.
  - `Total Detections`: Aggregate anomalies identified across all missions.
  - `High Confidence`: Detections with confidence score $\ge 80\%$.
  - `Specialist Models`: Operational status of all 3 specialist neural networks (3/3 Ready).
- **Platform Status Banner**: Live FastAPI backend connectivity indicator, active scan filename, target domain, and routing confidence.
- **Confidence Distribution Chart**: Statistical breakdown of detection confidences for the current scan.

---

## 10. Analysis Pipeline

The **Analysis Pipeline** interface (`#/analyze`) guides operators through a structured ingestion and verification flow:

```mermaid
flowchart TD
    subgraph Pipeline["End-to-End Analysis Pipeline"]
        P1["1. Data Ingestion\n(Binary Sonar / Optical / Hardware Capture)"]
        P2["2. Image Quality Check\n(Expandable 10-Substep Acoustic Suite)"]
        P3["3. Tensor Preprocessing\n(Resolution & Standardized 640x640 Bilinear Scaling)"]
        P4["4. Detection Execution\n(Specialist YOLOv8n + Non-Maximum Suppression)"]
        P5["5. Intelligence Mapping\n(Hazard, Location Risk, Priority Score Calculation)"]
        P6["6. Visualization & Reporting\n(Tactical Workspace, Geospatial Map, PDF/CSV Export)"]
    end

    P1 --> P2 --> P3 --> P4 --> P5 --> P6

    subgraph QualitySubsteps["10 Image Quality Substeps (Expandable Suite)"]
        Q1["1. Speckle / Acoustic Noise Reduction"]
        Q2["2. Intensity Normalization"]
        Q3["3. Contrast Enhancement"]
        Q4["4. Acoustic Shadow Enhancement"]
        Q5["5. Seabed / Background Suppression"]
        Q6["6. Geometric Correction (Slant to Ground Range)"]
        Q7["7. Resolution Standardization (640x640)"]
        Q8["8. Data Augmentation Robustness"]
        Q9["9. Dropout & Ping Loss Handling"]
        Q10["10. Dataset Cleaning & Artifact Pruning"]
    end

    P2 -.-> QualitySubsteps
```

1. **Data Ingestion**: File validation and preview generation for sonar or optical captures.
2. **Image Quality Check**: Automated assessment exposing ten distinct analysis substeps:
   - *Speckle / Acoustic Noise Reduction*
   - *Intensity Normalization*
   - *Contrast Enhancement*
   - *Acoustic Shadow Enhancement*
   - *Seabed / Background Suppression*
   - *Geometric Correction*
   - *Resolution & Image Size Standardization*
   - *Data Augmentation*
   - *Image Quality & Data Dropout Handling*
   - *Dataset Cleaning & Validation*
3. **Preprocessing**: Standardization and tensor conversion for neural network ingestion.
4. **Detection**: Domain specialist YOLOv8n execution with non-maximum suppression (NMS).
5. **Intelligence**: Automated mapping of bounding boxes to hazard, risk, and priority scores.
6. **Visualization & Reporting**: Immediate handoff to the Detection Workspace, Geospatial Map, and Report Generator.

*(Note: The progressive substep animation in the transition interface is an operator visual sequence; deep neural network inference itself executes asynchronously in under 50ms.)*

---

## 11. Hardware Integration

ORCA supports direct edge hardware ingestion from field acquisition laptops, ROV sensor packs, and tethered sonar transducers:

```mermaid
flowchart TD
    subgraph FieldEdge["Field Edge Acquisition Unit"]
        Sensor["Camera / Acoustic Transducer"] --> Img["Sensor Image File (.pbm / .png / .jpg)"]
        Sensor --> SonarTxt["Sonar Distance Text File (.txt)"]
    end

    subgraph NetworkAPI["Network & Ingestion Layer"]
        Img --> API["FastAPI Ingestion Endpoint\n(Configurable: VITE_HARDWARE_API_URL)"]
        SonarTxt --> API
    end

    subgraph AICore["ORCA AI Core Engine"]
        API --> RouterEngine["Visual Router & Specialist Inference"]
    end

    subgraph DashboardConsole["ORCA Operator Dashboard"]
        RouterEngine --> UIWorkspace["Detection Workspace & Live Hardware Card"]
        RouterEngine --> RepOutput["Mission Reports (Distance Telemetry Evidence)"]
    end
```

### Ingested Hardware Assets
1. **Sensor Image File**: Optical frame or acoustic sonar raster captured by the field sensor.
2. **Sonar Data Text File**: Sensor distance telemetry containing calibrated physical distance measurements.

This sonar distance data is ingested alongside the image and displayed as physical evidence in downstream reporting and object-distance interpretation. Hardware connectivity is configurable through environment variables (`VITE_HARDWARE_API_URL`, default `http://localhost:5000`), allowing field units to interface across any local subnet or radio link.

---

## 12. Geospatial Anomaly Mapping

The **Geospatial View** (`#/geospatial`) links detected underwater anomalies to geographic and maritime coordinates:

- **Interactive Maritime Bathymetry**: Powered by Leaflet with ocean tile layers and hydrographic sector plots.
- **Anomaly Waypoint Markers**: Visual pins for each detected object, color-coded by specialist model and confidence.
- **Spatial Inspection**: Clicking an anomaly pin reveals its bounding box, detection class, confidence score, and review status.

> [!NOTE]
> **Spatial Data Integrity**: ORCA provides a geospatial visualization layer designed to combine detection evidence with verified spatial metadata when available. ORCA does not claim that verified GPS coordinates can be generated from raw sonar imagery alone; when raw sensor imagery lacks onboard navigation headers, coordinates are plotted against deterministic offshore survey sectors with clear estimation disclaimers.

---

## 13. Scan History

The **Scan History** console (`#/history`) provides historical mission visibility across all analyzed imagery:

- **Persistent Scan Records**: Retains scan filenames, timestamps, model targets, detection tallies, and routing confidence.
- **Operational Filtering**: Filter previous scans by target domain (`pipeline`, `human`, `hardware`) or review status.
- **One-Click Session Reloading**: Instantly reload any historical scan back into the Detection Workspace or Report Generator for comparative analysis.

---

## 14. Structured Reporting & PDF Export

The **Reports & Intelligence** module (`#/reports`) compiles mission findings into formal operational deliverables:

- **Mission Metadata**: Scan ID, file name, timestamp, active specialist model, and routing confidence.
- **Annotated Detection Evidence**: High-resolution cropped or annotated detection evidence with bounding box telemetry.
- **Operator Review Log**: Full audit trail reflecting whether each detection was `Confirmed`, `Rejected`, or flagged for `Review`.
- **Hardware Telemetry Evidence**: Displays physical sonar distance measurements when hardware scan data is available.
- **Multi-Format Export**:
  - **Client-Side PDF Generation**: Generates complete, printable PDF 1.4 mission reports client-side using vector primitives.
  - **Structured JSON Export**: Complete machine-readable schema for downstream command and control integration.
  - **Tabular CSV Export**: Comma-delimited detection coordinates and confidence tables for GIS tools.

---

## 15. Dataset Lab (Model Adaptation Workflow)

The **Dataset Lab** (`#/dataset-lab`) provides an operator-facing workflow for introducing new annotated datasets, evaluating model performance, and adapting specialist neural networks:

```mermaid
flowchart LR
    Step1["1. Dataset Upload\n(images, labels, data.yaml)"] --> Step2["2. Validation Gate\n(Pairing, Corrupt, Leakage Checks)"]
    Step2 --> Step3["3. Preprocessing\n(Standardization & Resizing)"]
    Step3 --> Step4["4. Model Adaptation\n(Base YOLOv8n Fine-Tuning)"]
    Step4 --> Step5["5. Evaluation Gate\n(Precision, Recall, mAP50)"]
    Step5 --> Step6["6. Model Registry\n(Activate New Specialist)"]
```

### The Six Workflow Stages
1. **Dataset Upload**: Accepts packaged archives containing standard YOLO directory layouts (`dataset/images`, `dataset/labels`, `dataset/data.yaml`).
2. **Dataset Validation**: Automated integrity checks verifying:
   - Image and label pairing consistency
   - Corrupted image file verification
   - Empty labels filtering
   - Invalid or out-of-bounds bounding box detection
   - Class ID consistency against `data.yaml`
   - Duplicate image detection
   - Train / validation / test data leakage checks
3. **Preprocessing**: Normalization, color space alignment, and standardized tensor dimension resizing.
4. **Training / Model Adaptation**: Workflow for fine-tuning a base YOLOv8n network on new domain data to produce a candidate specialist checkpoint.
5. **Evaluation**: Automated validation assessing Precision, Recall, $\text{mAP}_{50}$, and $\text{mAP}_{50\text{--}95}$ against operational acceptance thresholds.
6. **Model Registration**: Registers candidate checkpoints into the ORCA model catalog alongside active specialists.

*(Note: The Dataset Lab interface represents the architectural workflow and design specification for dataset onboarding; live arbitrary training execution is not currently exposed through the production REST API.)*

---

## 16. API & Backend Architecture

The backend is built as a high-performance **FastAPI** microservice supporting asynchronous request handling and structured serialization:

### Core Endpoints
- `GET /health`: Health status probe, active compute device (`cuda` or `cpu`), and model registry availability.
- `POST /predict`: Target-aware specialist inference. Accepts `multipart/form-data` with `file` and `target` (`pipeline`, `human`, or `hardware`).
- `POST /predict-auto`: Automatic visual domain routing followed by specialist inference. Automatically extracts 17 visual invariant features, gates degeneracy, routes to the specialist model, and returns detections with routing telemetry.
- `POST /analyze`: Comprehensive analysis endpoint returning structured detections, image dimensions, and model metadata.
- `POST /segment`: Returns strict `HTTP 501 Not Implemented` with an informative response, preventing synthetic or unverified contour generation.

### Swagger & OpenAPI Documentation
Interactive API documentation is automatically generated and accessible at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

---

## 17. Frontend Technology Stack

The ORCA operator dashboard is built with a modern web application stack:

- **React 19**: Declarative UI library for high-performance reactive component state management.
- **TypeScript**: Strict type safety across all API responses, detection schemas, and telemetry models.
- **Vite**: Rapid build tooling and optimized development server.
- **Vanilla CSS Design Tokens**: Custom dark glassmorphic design system (`index.css`) featuring curated cyan/emerald palettes, responsive flex/grid layouts, and micro-animations. *(Tailwind CSS is not used).*
- **Leaflet 1.9.4**: Interactive marine map rendering for coordinate tracking and anomaly markers.
- **Lucide React**: Clean, modern iconography for operator controls and telemetry indicators.

---

## 18. Backend Technology Stack

The backend microservice is implemented with a lightweight Python scientific stack:

- **Python 3.10 / 3.12**: Runtime language environment.
- **FastAPI**: Asynchronous web framework for high-throughput REST APIs.
- **Pydantic**: Strict data validation and schema enforcement.
- **PyTorch**: Deep learning execution runtime for CUDA GPU and CPU inference.
- **Ultralytics YOLOv8n**: Real-time object detection architecture.
- **OpenCV (headless)**: High-speed image decoding, color conversion, and gradient analysis.
- **Pillow**: Imaging support for Netpbm binary side-scan sonar formats (`.pbm`, `.bpm`).
- **NumPy**: Matrix operations and visual feature computation.
- **scikit-learn**: Multinomial Logistic Regression and StandardScaler execution for visual routing.
- **joblib**: Model and scaler serialization runtime.

---

## 19. Data & Storage Architecture

ORCA maintains a clear separation between current local runtime storage and architecture-ready enterprise services:

### Current Runtime Storage
- **Frozen Model Checkpoints**: Kept locally in the repository under [`models/`](models/) with SHA256 verification.
- **Local Application Storage**: Image caching and temporary session state managed locally.
- **Browser LocalStorage**: Retains operator scan history, user preferences, and manual review states (`confirmed`, `rejected`, `review_required`) without external server dependencies.
- **HTTP REST Communication**: Stateless client-server data transfer over FastAPI.

### Architecture-Ready Components
ORCA is architected to support PostgreSQL and MQTT integration as deployment requirements grow:
- **PostgreSQL**: Planned for persistent multi-user mission history, enterprise audit logs, and fleet telemetry synchronization.
- **MQTT**: Planned for lightweight streaming of sensor telemetry, transducer pings, and real-time ROV event channels.
- **Cloud Gateway**: Structured for seamless placement behind API gateways for remote shore-side access.

---

## 20. Cloud-Ready Architecture

ORCA features an API-first, decoupled microservice architecture supporting flexible deployment topologies:

```mermaid
flowchart TD
    subgraph OptionA["Deployment Option A: Edge / Field Vessel (Offline Standalone)"]
        SensorsA["Sensors & Sonar Transducers"] --> LaptopA["Field Acquisition Laptop / Ruggedized PC"]
        LaptopA --> BackendA["Local FastAPI Microservice (:8000)"]
        BackendA --> ModelsA["Local Frozen Models (models/)"]
        BackendA --> FrontendA["Local React Dashboard (:5173)"]
    end

    subgraph OptionB["Deployment Option B: Remote Shore-Side Cloud Infrastructure"]
        AUV["Subsea AUV / ROV Fleet"] --> SatLink["Satellite / UHF / 5G Maritime Uplink"]
        SatLink --> CloudGW["Cloud API Gateway (Reverse Proxy / Auth)"]
        CloudGW --> CloudBackend["Containerized FastAPI Microservices (Docker/K8s)"]
        CloudBackend --> DB["PostgreSQL Mission Database & Model Registry"]
        CloudBackend --> ShoreOps["Distributed Remote Shore-Side Operator Terminals"]
    end
```

$$\text{Hardware / Sonar} \longrightarrow \text{Data Ingestion API} \longrightarrow \text{AI Inference Services} \longrightarrow \text{Operational Dashboard}$$

The computational inference engine and the operator visualization dashboard are completely independent:
- **Field Deployment**: The entire stack runs self-contained on an edge laptop or ruggedized mission computer aboard a vessel without Internet access.
- **Remote / Cloud Deployment**: The FastAPI backend can be containerized (e.g. Docker / Kubernetes) on shore-side cloud infrastructure, while remote field sensors upload captures via satellite link and operators access the dashboard via standard web browsers.

ORCA is designed for cloud deployment without requiring a redesign of the core AI inference workflow.

---

## 21. Open & Dataset-Adaptive Architecture

ORCA is engineered as an **extensible platform**, not a closed single-purpose tool:

- **Modular Model Registry**: Adding a new specialist model (e.g. seabed geology, marine life, or anchor chain inspection) requires only registering a new checkpoint and entry in [`backend/app/models/registry.py`](backend/app/models/registry.py).
- **Extensible Router Invariants**: The automatic visual router can be retrained on additional domain features without touching the detection inference pipeline.
- **Sensor-Agnostic Ingestion**: The input pipeline accepts binary sonar grids, high-definition optical photographs, or thermal captures.
- **Independent Evolution**: Any individual specialist detector can be fine-tuned or upgraded without rebuilding or retesting the rest of the platform.

New specialist models can be added without rebuilding the entire platform.

---

## 22. Model Integrity & Checksums

To guard against accidental weight replacement, corruption, or supply-chain alteration, all three specialist checkpoints are verified using SHA256 checksums at load time:

| Specialist Checkpoint | Architecture | Size | Expected SHA256 Checksum |
| :--- | :--- | :--- | :--- |
| [`models/pipeline/best.pt`](models/pipeline/best.pt) | YOLOv8n | 5.93 MiB | `99470f62a4709848ec8a27b13f2925f09aaba292dccfaff440b7ec290cc011d3` |
| [`models/human/best.pt`](models/human/best.pt) | YOLOv8n | 5.94 MiB | `53e2c3ac2013cb0f35dd0e276c650ffa419198ece762c5a1e2e79e39f5cfed35` |
| [`models/hardware/best.pt`](models/hardware/best.pt) | YOLOv8n | 5.96 MiB | `1cb3f14132c5c1eb9fc8917fa8358b9338bfca9f35102b9ff36eb18c8aaaf3cd` |

The checkpoint loader ([`backend/app/models/loader.py`](backend/app/models/loader.py)) computes the SHA256 hash before instantiating the neural network, refusing to load tampered weights.

---

## 23. Repository Structure

```
mldashbordproject/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point
│   │   ├── config.py                   # Portable repository paths & environment configuration
│   │   ├── router.py                   # Target-aware specialist router logic
│   │   ├── models/
│   │   │   ├── registry.py             # Centralized model registry & metadata
│   │   │   └── loader.py               # Singleton checkpoint loader with SHA256 verification
│   │   ├── routes/
│   │   │   ├── health.py               # GET /health
│   │   │   ├── predict.py              # POST /predict
│   │   │   ├── predict_auto.py         # POST /predict-auto
│   │   │   ├── analyze.py              # POST /analyze
│   │   │   └── segment.py              # POST /segment (Strict 501 Not Implemented guard)
│   │   ├── services/
│   │   │   ├── auto_router.py          # 17-feature visual router & degeneracy gate
│   │   │   └── inference.py            # Image decoding (.pbm, .png, etc.) & YOLO execution
│   │   └── router_artifacts/
│   │       ├── router_config.json      # Visual invariant definitions & threshold metadata
│   │       ├── scaler.joblib           # Pre-fitted StandardScaler
│   │       └── logistic_router.joblib  # Pre-trained Multinomial Logistic Regression weights
│   ├── tests/
│   │   ├── test_model_registry.py      # Model registry validation suite (8 tests)
│   │   ├── test_model_loader.py        # Singleton caching & SHA256 test suite (9 tests)
│   │   ├── test_router.py              # Target-aware router smoke tests (13 tests)
│   │   └── test_predict_auto.py        # Dedicated /predict-auto integration suite (15 tests)
│   ├── requirements.txt                # Production backend dependencies
│   ├── requirements-dev.txt            # Test runner dependencies
│   └── .env.example                    # Backend environment template
├── frontend/
│   ├── src/                            # React 19 / TypeScript application source
│   ├── sample_data/                    # 10 repository-local sample test images
│   │   ├── 1693569383.780.pbm          # Pipeline sonar waterfall sample
│   │   ├── 1693569385.780.pbm          # Pipeline sonar waterfall sample
│   │   ├── 0a2be3cd-...png             # Human diver underwater photograph
│   │   ├── 0f3585a7-...png             # Human diver underwater photograph
│   │   └── cap_001.jpg, keys_..., etc. # Hardware equipment samples (6 files)
│   ├── public/                         # Public assets & static blanks
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── vite.config.ts                  # Vite build & proxy configuration
│   └── .env.example                    # Frontend environment template
├── models/                             # Frozen specialist model weights (~17.8 MiB total)
│   ├── pipeline/best.pt                # Model 1: Pipeline Specialist
│   ├── human/best.pt                   # Model 2: Human Specialist
│   └── hardware/best.pt                # Model 3: Hardware Specialist
├── verify_installation.py              # Zero-dependency judge smoke test script (28 checks)
├── HOWTORUN.md                         # Detailed step-by-step operational execution guide
├── README.md                           # Complete product documentation
└── .gitignore                          # Strict gitignore rules
```

---

## 24. Sample Testing Data

Judges, evaluators, and reviewers can fully test ORCA **without access to the original research datasets**. The repository includes 10 canonical test images in [`frontend/sample_data/`](frontend/sample_data/):

1. **Pipeline Domain (`.pbm`)**: Netpbm binary sonar waterfall frames (`1693569383.780.pbm`, `1693569385.780.pbm`).
2. **Human Domain (`.png`)**: Submerged human diver photographs (`0a2be3cd-Screenshot_2025-08-03_14.26.49.png`, `0f3585a7-Screenshot_2025-08-03_14.04.12.png`).
3. **Hardware Domain (`.jpg`)**: Real tool captures (`cap_001.jpg`, `keys_002.jpg`, `keys_003.jpg`, `niddle_001.jpg`, `niddle_008.jpg`, `scissor_001.jpg`).

All 10 sample images route with **>97% confidence** to their respective domain specialist models.

*(Note: These sample files are provided for demonstration and testing; they do not constitute the full training datasets.)*

---

## 25. Installation & Clean-Clone Setup

### Prerequisites
- **Python 3.10+** (Tested on Python 3.10 and 3.12)
- **Node.js 18+** and **npm**
- *(Optional)* NVIDIA GPU with CUDA for accelerated GPU inference.

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd mldashbordproject
```

### Step 2: Set Up Backend Virtual Environment (.venv)

Create an isolated virtual environment to prevent package conflicts with the system Python:

```bash
# Create virtual environment in project root
python3 -m venv .venv

# Activate virtual environment
# On Linux / macOS:
source .venv/bin/activate
# On Windows: .venv\Scripts\activate

# Upgrade pip and install production backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

> [!TIP]
> **GPU Acceleration**: If you have an NVIDIA GPU, install PyTorch matching your installed CUDA toolkit version (e.g. for CUDA 12.1: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121`). If CUDA is unavailable, PyTorch automatically runs on CPU without configuration changes.

Verify installed libraries in `.venv`:
```bash
python -c "import fastapi, uvicorn, pydantic, torch, torchvision, ultralytics, cv2, PIL, sklearn, joblib, numpy; print('✓ All ORCA libraries verified in .venv!')"
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 26. Team Development Environment

### ORCA Team Development Environment
The ORCA development environment used during model development is stored separately from the repository. The repository itself contains the application source, frozen model checkpoints, router artifacts, and sample testing assets required for evaluation.

Judges and evaluators do not require the team's development environment; standard virtual environments created from `backend/requirements.txt` work identically.

---

## 27. Running ORCA

### Standard Execution (Judges / Evaluators)

Always launch the backend from the **repository root directory** (`mldashbordproject`) to ensure standard Python module resolution:

#### Terminal 1: Launch Backend API
```bash
# Ensure your virtual environment is active
source .venv/bin/activate

# Launch FastAPI via Uvicorn from the repository root
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
- API Endpoint: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Health Probe: `http://127.0.0.1:8000/health`

#### Terminal 2: Launch Frontend Dashboard
```bash
cd frontend
npm run dev
```
- Operator Dashboard: `http://127.0.0.1:5173`

---

### Team Local Machine Command
On the team development workstation, the verified environment is launched directly:
```bash
"/media/cherry/External Hardisk/py notebook/xai_env/bin/python" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

---

## 28. Verify Installation (Smoke Test)

A standalone verification script is included to validate the environment, models, SHA256 hashes, router artifacts, and sample data in under 2 seconds:

```bash
python verify_installation.py
```

Expected output:
```
========================================================================
      ORCA — REPOSITORY INTEGRITY & INSTALLATION SMOKE TEST             
========================================================================
  [PASS] Models directory exists
  [PASS] Model 1 — Pipeline Specialist SHA256 verified
  [PASS] Model 2 — Human Specialist SHA256 verified
  [PASS] Model 3 — Hardware Specialist SHA256 verified
  [PASS] Router config readable & valid
  [PASS] Sample images present (10 canonical images)
  [PASS] Core package imports available
========================================================================
  RESULT: ALL 28/28 CHECKS PASSED — REPOSITORY READY FOR JUDGING!
========================================================================
```

---

## 29. Testing & Quality Assurance

### Automated Backend Tests
Run the automated test suites using the active Python environment:
```bash
# Model registry metadata and class isolation tests (8 tests)
python backend/tests/test_model_registry.py

# Checkpoint loader and SHA256 verification tests (9 tests)
python backend/tests/test_model_loader.py

# Target-aware router validation tests (13 tests)
python backend/tests/test_router.py

# Dedicated /predict-auto automatic routing integration tests (15 tests)
python backend/tests/test_predict_auto.py
```

### Frontend Code Quality Tests
Verify the frontend codebase from the `frontend/` directory:
```bash
cd frontend

# TypeScript static type check (0 errors)
npx tsc --noEmit

# ESLint code hygiene check (0 warnings/errors)
npm run lint

# Production bundle compilation
npm run build
```

---

## 30. Interactive API Documentation (Swagger)

Once the backend is running, open your browser to:

$$\text{http://127.0.0.1:8000/docs}$$

Reviewers can inspect request schemas, review parameter specifications, and execute live test inferences directly through the interactive Swagger UI.

---

## 31. ORCA Feature Map

| ORCA Feature | Purpose |
| :--- | :--- |
| **Automatic Model Routing** | Inspects 17 visual invariants to automatically select the optimal specialist AI domain |
| **Pipeline Specialist** | YOLOv8n network trained for subsea pipeline and conduit defect detection |
| **Human Specialist** | YOLOv8n network trained for underwater human diver and personnel detection |
| **Hardware Specialist** | YOLOv8n network trained for subsea hardware, tools, and recovery targets |
| **Detection Workspace** | Interactive inspection canvas for visual bounding box analysis and evidence verification |
| **Detection Priority** | Organizes detections into hazard context, location risk, and recommended action |
| **Expert Review** | Human-in-the-loop verification workflow (`Confirm`, `Reject`, `Review`) |
| **Geospatial View** | Interactive Leaflet maritime chart displaying anomaly locations and survey tracks |
| **Scan History** | Persistent local scan inventory enabling side-by-side historical mission comparison |
| **Reports & Export** | Compiles operational mission reports with client-side PDF, JSON, and CSV exports |
| **Hardware Integration** | Ingests synchronized field image frames and sonar distance data over network APIs |
| **Dataset Lab** | Structured 6-stage workflow for dataset validation, fine-tuning, and model adaptation |
| **Swagger UI** | Interactive OpenAPI interface for testing and reviewing backend REST endpoints |
| **Cloud-Ready Architecture** | Modular, decoupled API-first design supporting local edge or remote cloud deployment |
| **Open & Dataset-Adaptive Architecture** | Extensible architecture allowing addition of new datasets, sensors, and specialist models |

---

## 32. Operational Notes

- **Domain-Specific Specialists**: ORCA uses specialized models rather than a single universal detector. Specialist models must be invoked on imagery matching their training domain.
- **Router Abstention & Uncertainty**: Imagery that exhibits low confidence ($\tau < 0.85$) or degenerate characteristics triggers an `uncertain` state. This abstention is by design to prevent false positive detections and prompt expert operator review.
- **Geospatial Metadata**: Geospatial visualization outputs combine detection evidence with verified spatial metadata when available. In the absence of onboard navigation GPS, estimated maritime sector coordinates are provided with clear estimation notes.
- **Cloud Deployment Infrastructure**: Cloud deployment is supported by ORCA's modular microservice architecture and can be introduced through standard containerization and deployment infrastructure without altering core inference code.
- **Hardware Network Connectivity**: Field hardware telemetry ingestion depends on local network connectivity between the sensor capture unit and the backend (configurable via `VITE_HARDWARE_API_URL`).

---

## 33. Product Positioning

> "ORCA is designed not as a single-purpose detector or proof-of-concept prototype, but as a complete, fully operational multimodal underwater intelligence platform that connects sensing, specialist AI, operator intelligence, expert verification, geospatial context, and reporting into one unified production-ready workflow."

### Complete Operational Product (Not a Prototype)
ORCA is delivered as an **end-to-end, fully realized operational software product**, featuring:
- Production-grade decoupled microservices (FastAPI asynchronous backend + React 19 / TypeScript dashboard).
- Repository-local frozen deep learning neural networks verified by cryptographic SHA256 integrity checksums.
- Automatic sub-15ms visual domain routing with degeneracy filtering and confidence abstention gates.
- Real-time tactical decision support organizing raw detections into operational hazard tiers, location risk, and prioritized action orders.
- Interactive maritime bathymetry geospatial mapping and client-side vector PDF 1.4 mission reporting.
- Ready for immediate operational evaluation and vessel deployment without external research drive dependencies.

---

## 34. License & Usage Terms

### MIT License with Explicit Prior Permission Requirement
Copyright (c) 2026 **A SRI SAI CHARAN**, **Team Synkros** — **Andhra University**.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to inspect, evaluate, and test the Software, subject to the following express condition:

> [!IMPORTANT]
> **Prior Written Permission Required**: Any commercial use, production deployment, public redistribution, derivative modification, benchmarking, or academic reproduction of this Software is strictly permitted **only after obtaining explicit prior written permission** from the author / copyright holder.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 35. Authors & Product Credits

**ORCA — Multimodal Underwater Intelligence Platform** is proudly developed and engineered as a complete operational product for **Smart India Hackathon 2026** (Problem Statement SIH26057).

- **Lead Developer**: **A SRI SAI CHARAN**
- **Email (Queries & Usage Permissions)**: [`cherry2544t@gmail.com`](mailto:cherry2544t@gmail.com)
- **Team**: **Team Synkros**
- **Institution**: **Andhra University**
- **Product Status**: **Complete Operational Platform (Fully Realized Product — Not a Prototype)**
- **Problem Statement**: **SIH26057**

*ORCA — Multimodal Underwater Intelligence Platform. Connecting Sonar, Hardware Sensing, Specialist AI, and Operator Decision Support.*
