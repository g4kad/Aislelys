// The single source of truth for the "ten-brides" survey's questions —
// shared by the form (TenBridesPage) and the results view
// (TenBridesResultsPage), so a question's wording/section only ever needs
// to change in one place.

export const SURVEY_ID = "ten-brides";
export const MIN_TEXT_LENGTH = 45;

// Each question is mcq (single-choice), text (free-form) or scale (1-5) —
// every question is required. `section` groups consecutive questions under
// one heading. `followUp` adds a text box that only appears (and is then
// itself required) once a specific option is picked (used for "No, and
// why?"). Add more entries to extend the survey — the form, grouping,
// validation, submission and results view all follow from this list.
type QuestionBase = {
  id: string;
  section: string;
  prompt: string;
};

export type Question =
  | (QuestionBase & {
      type: "mcq";
      options: string[];
      followUp?: { id: string; whenOption: string; placeholder: string };
    })
  | (QuestionBase & { type: "mcq-multi"; options: string[] })
  | (QuestionBase & { type: "text"; placeholder?: string })
  | (QuestionBase & { type: "scale"; min: number; max: number; minLabel?: string; maxLabel?: string });

const FEATURE_OPTIONS = ["Planner", "Guest list", "Budget", "Vendors", "Inspiration board", "Our Big Day"];
const ALL_FEATURE_OPTIONS = ["Overview", "Planner", "Guest list", "Budget", "Vendors", "Inspiration board", "Our Big Day"];

export const QUESTIONS: Question[] = [
  {
    id: "setup-ease",
    section: "Getting started",
    type: "scale",
    prompt: "How easy was it to set up your wedding on Aislelys?",
    min: 1,
    max: 5,
  },
  {
    id: "first-excited-feature",
    section: "Getting started",
    type: "mcq",
    prompt: "What was the first thing you were excited to try?",
    options: FEATURE_OPTIONS,
  },
  {
    id: "navigation-ease",
    section: "Getting started",
    type: "mcq",
    prompt: "Was navigating around the website easy?",
    options: ["Yes", "No", "Somewhat"],
  },
  {
    id: "setup-confusion",
    section: "Getting started",
    type: "text",
    prompt: "Was there anything you couldn't figure out how to do?",
    placeholder: "Tell us what tripped you up",
  },
  {
    id: "planner-add-task-ease",
    section: "Planner",
    type: "scale",
    prompt: "How easy was it to add a task for you and your partner?",
    min: 1,
    max: 5,
  },
  {
    id: "planner-usefulness",
    section: "Planner",
    type: "scale",
    prompt: "How useful was the day-to-day planner for keeping track of your tasks?",
    min: 1,
    max: 5,
  },
  {
    id: "planner-layout-confusing",
    section: "Planner",
    type: "text",
    prompt: "Was the layout confusing to look at?",
    placeholder: "Your answer",
  },
  {
    id: "planner-missing",
    section: "Planner",
    type: "text",
    prompt: "What's one thing the planner is missing for you?",
    placeholder: "What would make it better?",
  },
  {
    id: "guest-list-ease",
    section: "Guest list",
    type: "scale",
    prompt: "How easy was it to build and manage your guest list?",
    min: 1,
    max: 5,
  },
  {
    id: "guest-list-link",
    section: "Guest list",
    type: "mcq",
    prompt: "Did you use the shared link to let your parents add their guests?",
    options: ["Yes, it worked well", "Yes, but it was confusing", "No, didn't need it", "Didn't know about it"],
  },
  {
    id: "guest-list-missing",
    section: "Guest list",
    type: "text",
    prompt: "What was missing and can be improved for you in guest list?",
    placeholder: "What would make it better?",
  },
  {
    id: "budget-clarity",
    section: "Budget & vendors",
    type: "scale",
    prompt: "How well did the budget tracker help you understand where your money is going?",
    min: 1,
    max: 5,
  },
  {
    id: "budget-calculating-helpful",
    section: "Budget & vendors",
    type: "text",
    prompt: "Was calculating your budget with Aislelys helpful?",
    placeholder: "Your answer",
  },
  {
    id: "vendor-tracking",
    section: "Budget & vendors",
    type: "mcq",
    prompt: "How useful was vendor tracking compared to what you used before, such as spreadsheets, notes or WhatsApp?",
    options: ["Much better", "About the same", "Worse", "Didn't use it"],
  },
  {
    id: "inspiration-experience",
    section: "Inspiration board",
    type: "text",
    prompt: "How was your experience with the inspiration board?",
    placeholder: "Your answer",
  },
  {
    id: "inspiration-tracking-ease",
    section: "Inspiration board",
    type: "mcq",
    prompt: "Was it easier for you to keep track of your inspiration?",
    options: ["Yes", "No", "Somewhat"],
  },
  {
    id: "partner-involvement",
    section: "Planning together",
    type: "mcq",
    prompt: "Did your partner plan with you on Aislelys?",
    options: ["Yes, actively", "Occasionally", "No"],
  },
  {
    id: "planning-together-improvement",
    section: "Planning together",
    type: "text",
    prompt: "What would make it easier to plan together with your partner or family?",
    placeholder: "Your answer",
  },
  {
    id: "favourite-thing",
    section: "The big picture",
    type: "text",
    prompt: "What is your favourite thing about Aislelys?",
    placeholder: "Give us a positive feedback",
  },
  {
    id: "least-favourite-thing",
    section: "The big picture",
    type: "text",
    prompt: "What did you not like about Aislelys?",
    placeholder: "Your answer",
  },
  {
    id: "most-used-feature",
    section: "The big picture",
    type: "mcq",
    prompt: "Which feature did you use the most?",
    options: FEATURE_OPTIONS,
  },
  {
    id: "most-missed-feature",
    section: "The big picture",
    type: "mcq-multi",
    prompt: "Which feature will you be using the most? (You can select more than one)",
    options: ALL_FEATURE_OPTIONS,
  },
  {
    id: "wishlist-feature",
    section: "The big picture",
    type: "text",
    prompt: "What's one feature you wish Aislelys had?",
    placeholder: "Your answer",
  },
  {
    id: "willingness-to-pay",
    section: "The big picture",
    type: "mcq",
    prompt: "After launch, would you pay S$10 for Aislelys?",
    options: ["Yes", "Maybe", "No"],
    followUp: { id: "willingness-to-pay-why", whenOption: "No", placeholder: "Tell us why" },
  },
];

// Every section name, in the order questions first appear — drives the
// results page's grouping the same way the form groups its headings.
export const SECTIONS: string[] = Array.from(new Set(QUESTIONS.map((q) => q.section)));
