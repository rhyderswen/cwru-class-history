import SearchBar, { SearchBarHandle } from "@/components/SearchBar";
import { Box, Group, Title } from "@mantine/core";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

const MOCKDATA = [
  "CSDS - Computer Science",
  "ECSE - Electrical, Computer and Systems Engineering",
  "JAPN - Japanese",
  "MATH - Mathematics",
  "PHYS - Physics",
  "COGS - Cognitive Science",
];

export interface TopbarProps {
  children: React.ReactNode;
}

const Topbar = ({ children }: TopbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [_, setSearchParams] = useSearchParams();
  const searchBarRef = useRef<SearchBarHandle>(null);

  useEffect(() => {
    if (location.pathname === "/") {
      searchBarRef.current?.clear();
    }
  }, [location]);

  return (
    <div className="root">
      <div className="App">
        <Link to="/">
          <Title order={1} mb="lg" ta="center">
            CWRU Course History
          </Title>
        </Link>
        <Group wrap="nowrap" gap="sm">
          <Box
            style={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
              transition: "flex-grow 200ms ease",
            }}
          >
            <SearchBar
              options={MOCKDATA}
              onSubmit={(value) => navigate(`/search/${value.substring(0, 4)}`)}
              placeholder="Search for a department..."
              validation={(value) =>
                !/^[a-zA-Z]{4}$/.test(value.substring(0, 4)) ?
                  "Input must be a 4-letter department code"
                : null
              }
              ref={searchBarRef}
            />
          </Box>

          <Box
            style={{
              flexGrow: location.pathname.startsWith("/search/") ? 1 : 0,
              flexBasis: 0,
              minWidth: 0,
              overflow: "hidden",
              transition: "flex-grow 200ms ease",
            }}
          >
            <SearchBar
              placeholder="Filter classes..."
              onChange={(value) =>
                value !== "" ? setSearchParams({ q: value }) : setSearchParams({})
              }
              validation={(value) =>
                !/^[a-zA-Z]{4}$/.test(value.substring(0, 4)) ?
                  "Input must be a 4-letter department code"
                : null
              }
            />
          </Box>
        </Group>
      </div>
      {children}
    </div>
  );
};

export default Topbar;
