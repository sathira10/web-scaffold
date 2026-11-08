// The projects both test files generate: every kind, plus the module combinations that matter.
// [name, create args, follow-up commands]
const site = [
  "--url",
  "https://site.test",
  "--email",
  "hello@site.test",
  "--description",
  "A test site.",
];

export const cases = [
  ["demo", ["--kind", "demo", "--name", "Demo Choir"], []],
  [
    "demo-live",
    [
      ...["--kind", "demo", "--name", "Live Choir", "--description", "A community choir."],
      ...["--with", "contact-form,check-site"],
    ],
    [
      [
        ...["go-live", "--url", "https://choir.test", "--email", "hi@choir.test"],
        ...["--hosting", "cf-git", "--with", "analytics"],
      ],
    ],
  ],
  [
    "marketing",
    [
      "--kind",
      "marketing",
      "--name",
      "Market Site",
      ...site,
      "--with",
      "analytics,contact-form,dark-theme",
    ],
    [],
  ],
  ["content", ["--kind", "content", "--name", "Docs Site", ...site], []],
  [
    "firebase-site",
    [
      "--kind",
      "marketing",
      "--name",
      "Fire Site",
      ...site,
      "--hosting",
      "firebase",
      "--without",
      "e2e,ci",
    ],
    [],
  ],
  ["app", ["--kind", "app", "--name", "Plain App"], []],
  ["app-api", ["--kind", "app", "--name", "Api App", "--with", "worker-api,d1,ui-kit"], []],
  ["app-firebase", ["--kind", "app", "--name", "Fire App", "--hosting", "firebase"], []],
  [
    "app-add",
    ["--kind", "app", "--name", "Grow App"],
    [
      ["add", "worker-api", "--force"],
      ["add", "d1"],
    ],
  ],
  ["scratch", ["--kind", "scratch", "--name", "Audio Lab"], []],
];
