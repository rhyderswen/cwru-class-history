import { CourseConflictResult } from "#/handlers/conflictsBetweenCourses";
import { DepartmentDataEvent, QueuedEvent } from "#/main";
import CourseConflicts from "@/components/CourseConflicts";
import Selector from "@/components/Selector";
import { useURLParams } from "@/contexts/urlParamContext";
import { Box, Center, Group, Progress, Stack, Text, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { KeyboardEvent, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { searchParams, updateParam } = useURLParams();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [queued, setQueued] = useState(false);

  const form = useForm<{
    input: string;
    semester: string;
  }>({
    initialValues: {
      input: "",
      semester: "Fall",
    },
    validate: {
      input: validateCourses,
    },
    transformValues: (values) => ({
      ...values,
      input: formatCourses(values.input),
    }),
  });

  function formatCourses(value: string) {
    return [
      ...new Set(
        value
          .split(",")
          .map((course) => course.replace(/\s/g, "").toUpperCase())
          .filter((c) => c.length > 0),
      ),
    ].join(",");
  }

  function validateCourses(value: string) {
    const courses = formatCourses(value).split(",");

    if (courses.length < 2) return "Please enter at least two unique courses!";
    if (courses.length > 10) return "Please enter at most ten courses!";
    if (courses.every((course) => /^[A-Za-z]{4}\s?\d{3}$/.test(course))) {
      return null;
    } else {
      return "This is not formatted correctly!";
    }
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["conflicts", searchParams.get("sem"), searchParams.get("q")],
    queryFn: () =>
      new Promise<{ term: string; courses: CourseConflictResult[] }>((resolve, reject) => {
        const seen = new Set<string>();
        const done = new Set<string>();
        setProgress({ done: 0, total: 0 });

        const source = new EventSource(
          `/api/conflictsBetweenCourses/${searchParams.get("sem")}/${searchParams.get("q")}`,
        );

        source.addEventListener("queued", (e) => {
          const event: QueuedEvent = JSON.parse(e.data);
          setQueued(event.isQueued);
        });

        source.addEventListener("progress", (e) => {
          const event: DepartmentDataEvent = JSON.parse(e.data);
          if (event.status === "started") seen.add(event.department);
          if (event.status === "finished") done.add(event.department);
          setProgress({ done: done.size, total: seen.size });
        });

        source.addEventListener("done", (e) => {
          resolve(JSON.parse(e.data));
          source.close();
        });

        source.addEventListener("failed", (e) => {
          const { status, message } = JSON.parse(e.data);
          const err = new Error(message ?? "Failed to fetch") as Error & { status?: number };
          err.status = status;
          reject(err);
          source.close();
        });

        source.addEventListener("error", () => {
          reject(new Error("Connection to server lost"));
          source.close();
        });
      }),
    retry: (failureCount, error) => {
      const status = (error as Error & { status?: number }).status;
      // Don't retry client errors (4xx)
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    enabled:
      location.pathname.startsWith("/conflicts") &&
      !!searchParams.get("sem") &&
      !!searchParams.get("q"),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  console.log(data);

  function onSubmit(input: string, semester: string) {
    navigate(`/conflicts?sem=${encodeURIComponent(semester)}&q=${encodeURIComponent(input)}`);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <>
      <Center>-or-</Center>
      <form
        ref={formRef}
        onSubmit={form.onSubmit((values) => onSubmit(values.input, values.semester))}
      >
        <Stack gap={4}>
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <Stack gap={0}>
              <Text component="label" htmlFor="course-input" size="sm" fw={500}>
                Check if courses conflict
              </Text>
              <Text component="label" htmlFor="course-input" size="xs" c="dimmed">
                Enter a comma seperated list of shorthand courses (i.e. CSDS132, Math 223,phys121)
              </Text>
            </Stack>
            <Box w="fit-content" flex="0 0 auto">
              <Selector
                key={form.key("semester")}
                options={["Fall", "Spring", "Summer"]}
                onSelected={(sem) => {
                  form.setFieldValue("semester", sem);
                  if (searchParams.get("sem") && searchParams.get("sem") !== sem)
                    updateParam("sem", sem);
                }}
                overrideValue={searchParams.get("sem") ?? undefined}
                my={0}
              />
            </Box>
          </Group>
          <Textarea
            id="course-input"
            {...form.getInputProps("input")}
            key={form.key("input")}
            placeholder="Enter some courses..."
            autosize
            minRows={1}
            onChange={(event) => form.setFieldValue("input", event.currentTarget.value)}
            onKeyDown={submitOnEnter}
          />
        </Stack>
      </form>
      {location.pathname.startsWith("/conflicts") &&
        !!searchParams.get("sem") &&
        !!searchParams.get("q") && (
          <>
            {isError ?
              <Center py="xl" w="100%">
                <Text ta="center" mb="lg">
                  {error instanceof Error ? error.message : "An unknown error occurred."}
                </Text>
              </Center>
            : isLoading ?
              <Center py="xl" w="100%">
                <Stack align="center" w="100%" gap="xs">
                  <Text ta="center">
                    Fetching course data from SIS. If this hasn't been cached recently, this may
                    take a bit...
                  </Text>
                  <Progress
                    value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
                    w="60%"
                    animated
                  />
                  {progress.total > 0 && (
                    <Text size="sm" c="dimmed">
                      {progress.done} / {progress.total} departments fetched
                    </Text>
                  )}
                  {queued && (
                    <Text size="sm" c="dimmed">
                      The server is currently busy with another request. Your request has been
                      queued. Please do not refresh the page.
                    </Text>
                  )}
                </Stack>
              </Center>
            : <Stack align="stretch" w="100%" mx="auto" gap="sm">
                <Title order={4} mt="sm">
                  Conflicts in {data?.term}
                </Title>
                {data?.courses?.map((course: CourseConflictResult) => (
                  <CourseConflicts
                    key={course.courseCode}
                    courseCode={course.courseCode}
                    title={course.title}
                    conflicting={course.conflicting}
                    nonconflicting={course.nonconflicting}
                  />
                ))}
              </Stack>
            }
          </>
        )}
    </>
  );
}

export default Home;
