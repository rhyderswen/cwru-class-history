export enum CourseComponent {
  CLINICAL = "Clinical",
  COOP = "Co-op",
  DISCUSSION = "Discussion",
  DISSERTATION = "Dissertation",
  FIELD = "Field Study",
  INDEPENDENT = "Independent Study",
  LAB = "Laboratory",
  LECTURE = "Lecture",
  PERFORMANCE = "Performance",
  PHYSICALEDUCATION = "Physical Education",
  PRACTICUM = "Practicum",
  RECITAL = "Recital",
  RECITATION = "Recitation",
  RESEARCH = "Research",
  SEMINAR = "Seminar",
  STUDIO = "Studio",
  THESIS = "Thesis",
  WORKSHOP = "Workshop",
  UNKNOWN = "Unknown",
}

export const ComponentOrder: string[] = [
  CourseComponent.LECTURE,
  CourseComponent.SEMINAR,

  CourseComponent.PHYSICALEDUCATION,
  CourseComponent.CLINICAL,
  CourseComponent.COOP,
  CourseComponent.DISSERTATION,
  CourseComponent.THESIS,
  CourseComponent.FIELD,
  CourseComponent.INDEPENDENT,
  CourseComponent.RESEARCH,

  CourseComponent.DISCUSSION,
  CourseComponent.PRACTICUM,
  CourseComponent.LAB,
  CourseComponent.RECITATION,
  CourseComponent.STUDIO,
  CourseComponent.WORKSHOP,
  CourseComponent.PERFORMANCE,
  CourseComponent.RECITAL,

  CourseComponent.UNKNOWN,
];

export const DaysOfWeek: Record<string, string> = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  R: "Thursday",
  F: "Friday",
  S: "Saturday",
  U: "Sunday",
  A: "Asynchronous",
};

export const DayOrder = ["U", "M", "T", "W", "R", "F", "S", "A", ""]; // "A" is async, "" is for no specified days
