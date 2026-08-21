import { CourseData } from "#/libs/xlsx";
import { CourseDataEvent, QueuedEvent } from "#/main";
import Course from "@/components/Course";
import CourseFloating from "@/components/CourseFloating";
import Selector from "@/components/Selector";
import { useSearchPage } from "@/contexts/searchPageContext";
import { useURLParams } from "@/contexts/urlParamContext";
import {
  ActionIcon,
  Affix,
  Button,
  Center,
  CloseButton,
  Group,
  Progress,
  Stack,
  Text,
  Title,
  Transition,
} from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";

function Search() {
  const { searchParams, updateParam } = useURLParams();
  const { department } = useParams();
  const [scroll, scrollTo] = useWindowScroll();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [queued, setQueued] = useState(false);
  const { collapseAll } = useSearchPage();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["department", department],
    queryFn: () =>
      new Promise<CourseData[]>((resolve, reject) => {
        const seen = new Set<string>();
        const done = new Set<string>();
        setProgress({ done: 0, total: 0 });

        const source = new EventSource(
          `${import.meta.env.BASE_URL}api/lookupDepartment/${department}`,
        );

        source.addEventListener("queued", (e) => {
          const event: QueuedEvent = JSON.parse(e.data);
          setQueued(event.isQueued);
        });

        source.addEventListener("progress", (e) => {
          const event: CourseDataEvent = JSON.parse(e.data);
          if (event.status === "started") seen.add(event.term);
          if (event.status === "finished") done.add(event.term);
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
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  function filterData(data: CourseData[] | undefined): CourseData[] {
    const searchInput = searchParams.get("q") ?? "";
    const semFilter = searchParams.get("sem") ?? "";

    if (!data) return [];

    let filteredData = data;
    if (searchInput) {
      filteredData = data.filter(
        (course) =>
          course.courseCode.toLowerCase().includes(searchInput.toLowerCase()) ||
          course.title.toLowerCase().includes(searchInput.toLowerCase()),
      );
    }

    if (semFilter) {
      filteredData = filteredData.filter((course) =>
        Object.values(course.offerings).some((term) =>
          Object.keys(term).some((sem) => sem.startsWith(semFilter)),
        ),
      );
    }

    return filteredData;
  }

  return (
    <>
      <title>{`${department?.toUpperCase() ?? "CWRU"} Course History`}</title>
      <div className="App">
        <Group justify="space-between">
          <Group w="fit-content" gap={4}>
            <Selector
              options={["Fall", "Spring", "Summer"]}
              onSelected={(sem) => updateParam("sem", sem)}
              hideIndicator={searchParams.get("sem") === null}
            />
            {searchParams.get("sem") && <CloseButton onClick={() => updateParam("sem", "")} />}
          </Group>
          <Button
            variant="outline"
            onClick={collapseAll}
            c="gray.7"
            bd="1px solid var(--mantine-color-gray-2)"
            bg="gray.0"
          >
            Collapse All
          </Button>
        </Group>
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
                Fetching course data from SIS. If this hasn't been cached recently, this may take a
                bit...
              </Text>
              <Progress
                value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
                w="60%"
                animated
              />
              {progress.total > 0 && (
                <Text size="sm" c="dimmed">
                  {progress.done} / {progress.total} semesters fetched
                </Text>
              )}
              {queued && (
                <Text size="sm" c="dimmed">
                  The server is currently busy with another request. Your request has been queued.
                  Please do not refresh the page.
                </Text>
              )}
            </Stack>
          </Center>
        : <Stack align="stretch" w="100%" mx="auto" gap="sm">
            <Title order={4}>
              {filterData(data).length} {department?.toUpperCase()} courses{" "}
              <Text inline span>
                in the past 4 years
              </Text>
            </Title>
            {filterData(data)?.map((course: CourseData) => (
              <Course
                key={course.courseCode}
                courseCode={course.courseCode}
                title={course.title}
                offerings={course.offerings}
              />
            ))}
          </Stack>
        }
        <Affix position={{ bottom: 20, left: 20 }}>
          <Transition transition="slide-up" mounted={scroll.y > 0}>
            {(transitionStyles) => (
              <ActionIcon style={transitionStyles} onClick={() => scrollTo({ y: 0 })} size="xl">
                <ArrowUpIcon style={{ width: "70%", height: "70%" }} />
              </ActionIcon>
            )}
          </Transition>
        </Affix>
        <CourseFloating />
      </div>
    </>
  );
}

export default Search;
