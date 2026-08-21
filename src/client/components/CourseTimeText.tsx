import { getDayColor } from "@/libs/color";
import { Text } from "@mantine/core";

export interface TimeBadgeProps {
  section: number;
  days: string;
  time: string;
}

function CourseTimeText({ section, days, time }: TimeBadgeProps) {
  const textStr = `Section ${section} - ${days} ${time}:`;

  if (days.length === 0) {
    return (
      <Text c="var(--mantine-color-gray-5)" fw={700}>
        Section {section} - No time data
      </Text>
    );
  }

  if (days.length === 1) {
    return (
      <Text c={getDayColor(days.charAt(0))} fw={700}>
        {textStr}
      </Text>
    );
  }

  return (
    <Text
      variant="gradient"
      gradient={{
        from: getDayColor(days.charAt(0)),
        to: getDayColor(days.charAt(days.length - 1)),
        deg: 90,
      }}
      fw={700}
      w="fit-content"
    >
      {textStr}
    </Text>
  );
}

export default CourseTimeText;
