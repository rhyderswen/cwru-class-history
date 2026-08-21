import { Badge } from "@mantine/core";

export interface CourseBadgeProps {
  courseCode: string;
  displayStr?: string;
  color?: string;
}

function CourseBadge({ courseCode, displayStr, color }: CourseBadgeProps) {
  return (
    <a href={`#${encodeURIComponent(courseCode)}`} style={{ lineHeight: 1 }}>
      <Badge px={6} color={color ?? "blue"} className="pointer" tt="none">
        {displayStr ?? courseCode}
      </Badge>
    </a>
  );
}

export default CourseBadge;
