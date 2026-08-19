import { Text } from "@mantine/core";
import { DaysOfWeek } from "~/vars";

export function getDayColor(day: string, shade: number = 7): string {
  if (day.length !== 1) return "gray";

  switch (day) {
    case "M":
      return `var(--mantine-color-grape-${shade})`;
    case "T":
      return `var(--mantine-color-teal-${shade})`;
    case "W":
      return `var(--mantine-color-pink-${shade})`;
    case "R":
      return `var(--mantine-color-indigo-${shade})`;
    case "F":
      return `var(--mantine-color-orange-${shade})`;
    case "S":
      return `var(--mantine-color-red-${shade})`;
    case "U":
      return `var(--mantine-color-red-${shade})`;
    case "A": // Async
    default:
      return `var(--mantine-color-gray-${shade})`;
  }
}

export function getColoredNumber(num: number) {
  if (num <= 1) {
    return (
      <Text span c="red" inherit fw={700}>
        {num}
      </Text>
    );
  }

  if (num <= 5) {
    return (
      <Text span c="yellow.7" inherit fw={700}>
        {num}
      </Text>
    );
  }

  return (
    <Text span inherit>
      {num}
    </Text>
  );
}

export function shortenedDaysToColors(days: string) {
  if (days.startsWith("A")) {
    // async
    return (
      <Text span c={getDayColor("A")} inherit>
        {DaysOfWeek["A"]}
      </Text>
    );
  }

  return (
    <>
      {days.split("").map((day, index) => (
        <>
          <Text key={day} span c={getDayColor(day)} inherit>
            {DaysOfWeek[day]}
          </Text>
          {days.length > 2 && index < days.length - 1 ? ", " : ""}
          {days.length > 1 && index === days.length - 2 ? " and " : ""}
        </>
      ))}
    </>
  );
}

export function getCourseCodeColor(courseCode: string) {
  const num = Number(courseCode.split(" ")[1].slice(0, 3));

  let color: string;
  if (num < 100) color = "gray";
  else if (num < 200) color = "green.9";
  else if (num < 300) color = "yellow.9";
  else if (num < 400) color = "red.9";
  else if (num < 500) color = "violet.9";
  else if (num < 600) color = "cyan.9";
  else if (num < 700) color = "pink.9";
  else if (num < 800) color = "black";
  else color = "gray";

  return color;
}
