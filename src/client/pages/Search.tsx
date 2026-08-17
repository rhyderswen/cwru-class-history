import { CourseData } from "#/libs/xlsx";
import { CourseDataEvent, QueuedEvent } from "#/main";
import Course from "@/components/Course";
import CourseFloating from "@/components/CourseFloating";
import { SearchPageProvider } from "@/contexts/searchPageContext";
import { ActionIcon, Affix, Center, Progress, Stack, Text, Transition } from "@mantine/core";
import { useWindowScroll } from "@mantine/hooks";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";

function Search() {
  const [searchParams] = useSearchParams();
  const { department } = useParams();
  const [scroll, scrollTo] = useWindowScroll();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [queued, setQueued] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["department", department],
    queryFn: () =>
      new Promise<CourseData[]>((resolve, reject) => {
        const seen = new Set<string>();
        const done = new Set<string>();
        setProgress({ done: 0, total: 0 });

        const source = new EventSource(`/api/lookupDepartment/${department}`);

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
  });

  function filterData(data: CourseData[] | undefined): CourseData[] {
    const searchInput = searchParams.get("q") ?? "";

    if (!data) return [];
    if (!searchInput) return data;

    return data.filter(
      (course) =>
        course.courseCode.toLowerCase().includes(searchInput.toLowerCase()) ||
        course.title.toLowerCase().includes(searchInput.toLowerCase()),
    );
  }

  console.log(data);

  return (
    <SearchPageProvider>
      <title>{`${department?.toUpperCase() ?? "CWRU"} Course History`}</title>
      <div className="App">
        {isError ?
          <Center py="xl" w="100%">
            <Text ta="center" mb="lg">
              {error instanceof Error ? error.message : "An unknown error occurred."}
            </Text>
          </Center>
        : isLoading ?
          <Center py="xl" w="100%">
            <Stack align="center" w="100%" gap="xs">
              <Text ta="center" mb="lg">
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
        : <Stack align="stretch" w="100%" mx="auto" py="md" gap="sm">
            {filterData(data)?.map((course: CourseData) => (
              <Course
                key={course.courseCode}
                courseCode={course.courseCode}
                title={course.title}
                offerings={course.offerings}
              />
            ))}
            {filterData(data).length === 0 && (
              <Center>No courses found in the past 4 years.</Center>
            )}
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
    </SearchPageProvider>
  );
}

export default Search;
