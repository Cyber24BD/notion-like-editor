export interface MermaidTemplate {
  label: string
  code: string
}

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    label: 'Flowchart',
    code: `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do something]
  B -->|No| D[Do something else]
  C --> E[End]
  D --> E`,
  },
  {
    label: 'Sequence',
    code: `sequenceDiagram
  participant A as Alice
  participant B as Bob
  A->>B: Hello Bob
  B-->>A: Hi Alice
  A->>B: How are you?
  B-->>A: Great!`,
  },
  {
    label: 'Gantt',
    code: `gantt
  title Project plan
  dateFormat YYYY-MM-DD
  section Design
  Research :a1, 2024-01-01, 7d
  Wireframes :a2, after a1, 5d
  section Build
  Frontend :b1, after a2, 10d
  Backend :b2, after a2, 12d
  section Launch
  Testing :c1, after b1, 5d
  Release :c2, after c1, 2d`,
  },
  {
    label: 'Class',
    code: `classDiagram
  class Animal {
    +String name
    +makeSound()
  }
  class Dog {
    +fetch()
  }
  Animal <|-- Dog`,
  },
  {
    label: 'State',
    code: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading
  Loading --> Success
  Loading --> Error
  Success --> [*]
  Error --> Idle`,
  },
  {
    label: 'ER diagram',
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }
  ORDER {
    int id
    date created
  }`,
  },
  {
    label: 'Pie',
    code: `pie title Traffic sources
  "Search" : 45
  "Direct" : 25
  "Social" : 20
  "Referral" : 10`,
  },
  {
    label: 'Journey',
    code: `journey
  title User journey
  section Discover
    Visit site: 5: User
    Read docs: 4: User
  section Sign up
    Create account: 3: User
    Verify email: 2: User`,
  },
  {
    label: 'Git graph',
    code: `gitGraph
  commit
  branch develop
  checkout develop
  commit
  checkout main
  merge develop
  commit`,
  },
  {
    label: 'Mindmap',
    code: `mindmap
  root((Project))
    Design
      UI
      UX
    Build
      Frontend
      Backend
    Launch
      Marketing
      Support`,
  },
  {
    label: 'Timeline',
    code: `timeline
  title Project timeline
  2024-01 : Research
  2024-02 : Design
  2024-03 : Build
  2024-04 : Launch`,
  },
  {
    label: 'Quadrant',
    code: `quadrantChart
  title Priorities
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Do first
  quadrant-2 Plan
  quadrant-3 Delegate
  quadrant-4 Eliminate
  Feature A: [0.3, 0.8]
  Feature B: [0.7, 0.6]
  Feature C: [0.2, 0.2]`,
  },
  {
    label: 'Requirement',
    code: `requirementDiagram
  requirement test_req {
    id: 1
    text: The system shall work
    risk: high
    verifymethod: test
  }
  element test_entity {
    type: simulation
  }
  test_entity - satisfies -> test_req`,
  },
  {
    label: 'C4 context',
    code: `C4Context
  title System Context
  Person(user, "User", "A user of the system")
  System(app, "Application", "The system")
  Rel(user, app, "Uses")`,
  },
  {
    label: 'Sankey',
    code: `sankey-beta
A,B,10
A,C,5
B,D,8
C,D,2`,
  },
  {
    label: 'XY chart',
    code: `xychart-beta
  title "Sales"
  x-axis [Jan, Feb, Mar, Apr]
  y-axis "Revenue" 0 --> 100
  bar [20, 40, 60, 80]
  line [10, 30, 50, 70]`,
  },
  {
    label: 'Block',
    code: `block-beta
  columns 3
  A B C
  D E F`,
  },
  {
    label: 'Kanban',
    code: `kanban
  Todo
    [Create repo]
    [Write docs]
  In Progress
    [Build editor]
  Done
    [Setup project]`,
  },
  {
    label: 'Radar',
    code: `radar-beta
  title Skills
  axis Design, Development, Testing, Deployment
  curve Team
    Design: 80
    Development: 90
    Testing: 70
    Deployment: 60`,
  },
  {
    label: 'Treemap',
    code: `treemap-beta
  "Root"
    "Design": 30
    "Development": 50
    "Marketing": 20`,
  },
  {
    label: 'ZenUML',
    code: `zenuml
  title Demo
  Alice->Bob: Hello
  Bob->Alice: Hi`,
  },
  {
    label: 'Architecture',
    code: `architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service server(server)[Server] in api
  db:L -- R:server`,
  },
  {
    label: 'Packet',
    code: `packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"`,
  },
]
