export const availableApplicationsAndReportsTypes = [
  {
    value: "Funding Application 2024",
    label: "Funding Application 2024",
  },
  {
    value: "DFT Application",
    label: "DFT Application",
  },
  {
    value: "FRIS Application",
    label: "FRIS Application",
  },
  {
    value: "Finance Report",
    label: "Finance Report",
  },
  {
    value: "Narrative Report",
    label: "Narrative Report",
  },
  {
    value: "Field Report",
    label: "Field Report",
  }
]

export const availableDevelopmentStages = [
  {
    value: "Initial",
    label: "Initial",
  },
  {
    value: "Active",
    label: "Active",
  },
  {
    value: "Complete",
    label: "Complete",
  }]

export const availableLDAs = [
  {
    value: 'Emerging',
    label: 'Emerging'
  }
  ,
  {
    value: 'Established',
    label: 'Established'
  },
  {
    value: 'Depreciated',
    label: 'Depreciated'
  }
]

export const availableFocusAreas = [
  {
    value: 'Food Security',
    label: 'Food Security'
  },
  {
    value: 'Youth',
    label: 'Youth'
  }
]

export const availableLocations = [
  {
    value: 'Eastern Cape',
    label: 'Eastern Cape'
  },
  {
    value: 'Gauteng',
    label: 'Gauteng'
  },
  {
    value: 'Western Cape',
    label: 'Western Cape'
  }
]

export const availableFunders = [
  {
    value: 'Gates',
    label: 'Gates'
  },
  {
    value: 'UNHCR',
    label: 'UNHCR'
  },
  {
    value: 'World Bank',
    label: 'World Bank'
  }
]

export const availableFundingPeriods = [
  {
    value: '2023',
    label: '2023'
  },
  {
    value: '2024',
    label: '2024'
  },
  {
    value: '2025',
    label: '2025'
  }
]

export const availableStatuses = [
  {
    value: 'Pending',
    label: 'Pending'
  },
  {
    value: 'Approved',
    label: 'Approved'
  },
  {
    value: 'Rejected',
    label: 'Rejected'
  }
]

export const availableProgrammeOfficers = [
  {
    value: 'Nala Smith',
    label: 'Nala Smith'
  },
  {
    value: 'Jenny McBride',
    label: 'Jenny McBride'
  },
  {
    value: 'Walter Sisulu',
    label: 'Walter Sisulu'
  }
]

export const availableReportingStatuses = [
  {
    value: 'Pending',
    label: 'Pending'
  },
  {
    value: 'Audited',
    label: 'Audited'
  },
  {
    value: 'Rejected',
    label: 'Rejected'
  }
]

export const allApplications = [
  {
    id: 1,
    type: 'Funding Application (2024)',
    status: 'Paused',
    amount: "R126,000",
    dueDate: '01/01/2024',
    submittedDate: '01/01/2025',
    approvedDate: '01/01/2025',
    reports: [
      {
        id: 1,
        type: 'Finance Report (January)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 2,
        type: 'Finance Report (February)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 3,
        type: 'Finance Report (March)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 4,
        type: 'Narrative Report (Q1)',
        status: 'Overdue',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      }
    ]
  },
  {
    id: 2,
    type: 'Funding Application (2024)',
    status: 'Paused',
    amount: "R126,000",
    dueDate: '01/01/2024',
    submittedDate: '01/01/2025',
    approvedDate: '01/01/2025',
    reports: [
      {
        id: 5,
        type: 'Finance Report (January)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 6,
        type: 'Finance Report (February)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 7,
        type: 'Finance Report (March)',
        status: 'Approved',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      },
      {
        id: 8,
        type: 'Narrative Report (Q1)',
        status: 'Overdue',
        dueDate: '01/01/2024',
        submittedDate: '01/01/2025',
        approvedDate: '01/01/2025',
      }
    ]
  }
]

export const allFunders = [
  {
    id: 1,
    name: 'Woolworths',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: [
      {
        id: 1,
        name: 'Community Gardening fund',
        status: 'Underway',
        startDate: '01/01/2024',
        endDate: '01/01/2025',
        amount: 'R9,999,000',
        focusAreas: [
          'Youth',
          'Food Security'
        ],
        locations: [
          'FS',
          'GT',
          'KZN'
        ],
        fundedLDAs: 99,
        forms: [
          {
            id: 1,
            name: 'Primary reporting form (2025)',
            status: 'Pending',
            createdDate: '12/16/2024',
            startDate: '01/01/2025',
            endDate: '01/01/2026',
            questions: 17
          },
          {
            id: 2,
            name: 'Secondary reporting form (2024)',
            status: 'Underway',
            createdDate: '17/04/2024',
            startDate: '01/05/2024',
            endDate: '01/01/2025',
            questions: 4
          },
          {
            id: 3,
            name: 'Primary reporting form (2024)',
            status: 'Pending',
            createdDate: '12/11/2024',
            startDate: '01/01/2024',
            endDate: '01/01/2025',
            questions: 12
          },
        ]
      },
      {
        id: 2,
        name: 'Youth Development Fund',
        status: 'Underway',
        startDate: '01/01/2024',
        endDate: '01/01/2025',
        amount: 'R9,999,000',
        focusAreas: [
          'Youth',
          'Food Security'
        ],
        locations: [
          'All'
        ],
        fundedLDAs: 99,
        forms: []
      },
      {
        id: 3,
        name: 'Community Gardening fund',
        status: 'Underway',
        startDate: '01/01/2024',
        endDate: '01/01/2025',
        amount: 'R9,999,000',
        focusAreas: [
          'Youth',
          'Food Security'
        ],
        locations: [
          'FS',
          'GT',
          'KZN'
        ],
        fundedLDAs: 99,
        forms: []
      },
    ]
  },
  {
    id: 2,
    name: 'Mphatlalatsane Community Nutrition and & Development',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 3,
    name: 'Retshidisitswe Care Organization',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 4,
    name: 'Ikgomotseng Community Nutrition & Development Centre',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 5,
    name: 'Thlabologang Community Based Care Support Service',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 6,
    name: 'Ikgomotseng OVC Care organization',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 7,
    name: 'Zanoncedo Empowerment Centre',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  },
  {
    id: 8,
    name: 'Interchurch Local Development Agency',
    status: 'Underway',
    startDate: '01/01/2024',
    endDate: '01/01/2025',
    amount: 'R 9,999,000',
    ldas: 99,
    overdue: [
      2, 4
    ],
    focusAreas: [
      'Youth',
      'Food Security'
    ],
    funds: []
  }
]