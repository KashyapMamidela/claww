// GENERATED from the *.json files in this folder. Do not edit by hand: change a JSON file, then run
//   node supabase/functions/_shared/blueprints/build_index.mjs
// A test fails if this file and the JSON files disagree. (Deno edge functions and Vitest both import this
// plain module, which avoids JSON import attributes that the two runtimes handle differently.)

import type { Blueprint } from './schema.ts';

export const BLUEPRINTS: Blueprint[] = [
  {
    "id": "fat_loss-gym-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, gym",
    "goal": "fat_loss",
    "place": "gym",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Resistance training to keep muscle while eating less, moderate reps, shorter rests.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "fat_loss-gym-4d",
    "version": 1,
    "reviewed": false,
    "title": "Upper / Lower, 4 days, gym",
    "goal": "fat_loss",
    "place": "gym",
    "daysPerWeek": 4,
    "minMonths": 0,
    "split": "UL",
    "rationale": "Resistance training to keep muscle while eating less, moderate reps, shorter rests.",
    "days": [
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Upper B",
        "slots": [
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      },
      {
        "name": "Lower B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "squat",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75,
            "optional": true
          },
          {
            "pattern": "knee_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "core_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "fat_loss-home-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, home with dumbbells",
    "goal": "fat_loss",
    "place": "home",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Resistance training to keep muscle while eating less, moderate reps, shorter rests.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "fat_loss-none-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, no equipment",
    "goal": "fat_loss",
    "place": "none",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Resistance training to keep muscle while eating less, moderate reps, shorter rests.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "fat_loss-none-4d",
    "version": 1,
    "reviewed": false,
    "title": "Upper / Lower, 4 days, no equipment",
    "goal": "fat_loss",
    "place": "none",
    "daysPerWeek": 4,
    "minMonths": 0,
    "split": "UL",
    "rationale": "Resistance training to keep muscle while eating less, moderate reps, shorter rests.",
    "days": [
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45
          }
        ]
      },
      {
        "name": "Upper B",
        "slots": [
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          }
        ]
      },
      {
        "name": "Lower B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "squat",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              12,
              15
            ],
            "rir": 2,
            "restSec": 75,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          },
          {
            "pattern": "core_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              15,
              20
            ],
            "rir": 1,
            "restSec": 45,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "general-gym-2d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 2 days, gym",
    "goal": "general",
    "place": "gym",
    "daysPerWeek": 2,
    "minMonths": 0,
    "split": "FB",
    "rationale": "A balanced full-body routine that touches every movement pattern each session.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "general-gym-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, gym",
    "goal": "general",
    "place": "gym",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "A balanced full-body routine that touches every movement pattern each session.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "general-home-2d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 2 days, home with dumbbells",
    "goal": "general",
    "place": "home",
    "daysPerWeek": 2,
    "minMonths": 0,
    "split": "FB",
    "rationale": "A balanced full-body routine that touches every movement pattern each session.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "general-none-2d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 2 days, no equipment",
    "goal": "general",
    "place": "none",
    "daysPerWeek": 2,
    "minMonths": 0,
    "split": "FB",
    "rationale": "A balanced full-body routine that touches every movement pattern each session.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 120
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              12,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-gym-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, gym",
    "goal": "muscle",
    "place": "gym",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-gym-4d",
    "version": 1,
    "reviewed": false,
    "title": "Upper / Lower, 4 days, gym",
    "goal": "muscle",
    "place": "gym",
    "daysPerWeek": 4,
    "minMonths": 0,
    "split": "UL",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Upper B",
        "slots": [
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Lower B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "squat",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "knee_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "core_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-gym-5d",
    "version": 1,
    "reviewed": false,
    "title": "Push / Pull / Legs + Upper / Lower, 5 days, gym",
    "goal": "muscle",
    "place": "gym",
    "daysPerWeek": 5,
    "minMonths": 6,
    "split": "PPLUL",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Push",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Pull",
        "slots": [
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Legs",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-gym-6d",
    "version": 1,
    "reviewed": false,
    "title": "Push / Pull / Legs, 6 days, gym",
    "goal": "muscle",
    "place": "gym",
    "daysPerWeek": 6,
    "minMonths": 12,
    "split": "PPL",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Push",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Pull",
        "slots": [
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Legs",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Push (2)",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 2,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Pull (2)",
        "slots": [
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 2,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Legs (2)",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 2,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-home-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, home with dumbbells",
    "goal": "muscle",
    "place": "home",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-home-4d",
    "version": 1,
    "reviewed": false,
    "title": "Upper / Lower, 4 days, home with dumbbells",
    "goal": "muscle",
    "place": "home",
    "daysPerWeek": 4,
    "minMonths": 0,
    "split": "UL",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Upper B",
        "slots": [
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Lower B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "squat",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "core_flexion",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "muscle-none-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, no equipment",
    "goal": "muscle",
    "place": "none",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Each muscle is trained about twice a week with 10 to 20 hard sets, main lifts first, 6 to 12 reps close to failure.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 150
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              8,
              12
            ],
            "rir": 2,
            "restSec": 90
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 3,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "strength-gym-3d",
    "version": 1,
    "reviewed": false,
    "title": "Full body, 3 days, gym",
    "goal": "strength",
    "place": "gym",
    "daysPerWeek": 3,
    "minMonths": 0,
    "split": "FB",
    "rationale": "Heavier main lifts at 3 to 6 reps with long rests, accessories to support them.",
    "days": [
      {
        "name": "Full body A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Full body B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105,
            "optional": true
          },
          {
            "pattern": "core_anti_rotation",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Full body C",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "strength-gym-4d",
    "version": 1,
    "reviewed": false,
    "title": "Upper / Lower, 4 days, gym",
    "goal": "strength",
    "place": "gym",
    "daysPerWeek": 4,
    "minMonths": 0,
    "split": "UL",
    "rationale": "Heavier main lifts at 3 to 6 reps with long rests, accessories to support them.",
    "days": [
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Upper B",
        "slots": [
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Lower B",
        "slots": [
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "squat",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105,
            "optional": true
          },
          {
            "pattern": "knee_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "core_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      }
    ]
  },
  {
    "id": "strength-gym-5d",
    "version": 1,
    "reviewed": false,
    "title": "Push / Pull / Legs + Upper / Lower, 5 days, gym",
    "goal": "strength",
    "place": "gym",
    "daysPerWeek": 5,
    "minMonths": 6,
    "split": "PPLUL",
    "rationale": "Heavier main lifts at 3 to 6 reps with long rests, accessories to support them.",
    "days": [
      {
        "name": "Push",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Pull",
        "slots": [
          {
            "pattern": "vertical_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Legs",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "hinge",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          }
        ]
      },
      {
        "name": "Upper A",
        "slots": [
          {
            "pattern": "horizontal_push",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "horizontal_pull",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "vertical_push",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "vertical_pull",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "elbow_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "elbow_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      },
      {
        "name": "Lower A",
        "slots": [
          {
            "pattern": "squat",
            "role": "main",
            "sets": 4,
            "repRange": [
              3,
              6
            ],
            "rir": 2,
            "restSec": 180
          },
          {
            "pattern": "hinge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "lunge",
            "role": "accessory",
            "sets": 3,
            "repRange": [
              6,
              10
            ],
            "rir": 2,
            "restSec": 105
          },
          {
            "pattern": "knee_flexion",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60,
            "optional": true
          },
          {
            "pattern": "calf_raise",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          },
          {
            "pattern": "core_anti_extension",
            "role": "isolation",
            "sets": 2,
            "repRange": [
              10,
              15
            ],
            "rir": 1,
            "restSec": 60
          }
        ]
      }
    ]
  }
];
