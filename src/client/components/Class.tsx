import { CourseData } from "#/xlsx";
import { Box, Collapse, Divider, Group, Paper, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

function Class({ courseCode, title, offerings }: CourseData) {
  const [expanded, { toggle }] = useDisclosure(false);

  return (
    <Paper shadow="xs">
      <Box p="md" onClick={toggle} style={{ cursor: "pointer" }}>
        <Group justify="space-between" wrap="nowrap">
          <Text flex="0 0 auto">{courseCode}</Text>
          <Text truncate="end">{title}</Text>
        </Group>
      </Box>
      <Collapse expanded={expanded}>
        <Divider />
        <Box p="md">spooky!</Box>
      </Collapse>
    </Paper>
  );
}

export default Class;
