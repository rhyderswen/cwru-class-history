import { getDayColor } from "@/libs/color";
import { Badge } from "@mantine/core";

export interface TimeBadgeProps {
  section: number;
  days: string;
  time: string;
}

function CourseTimeText({ section, days, time }: TimeBadgeProps) {
  const textStr = `Section ${section} - ${days} ${time}`;

  if (days.length === 0) {
    return <Badge color="var(--mantine-color-gray-5)">Section {section} - No time data</Badge>;
  }

  if (days.length === 1) {
    return <Badge color={getDayColor(days.charAt(0))}>{textStr}</Badge>;
  }

  return (
    <Badge
      variant="gradient"
      gradient={{
        from: getDayColor(days.charAt(0)),
        to: getDayColor(days.charAt(days.length - 1)),
        deg: 90,
      }}
    >
      {textStr}
    </Badge>
  );
}

export default CourseTimeText;
