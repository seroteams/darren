// The whole admin screen: one header, four tabs, four tables. Counts live in the
// tab labels instead of stat cards, and the header carries a one-line summary, so
// the page needs no dashboard chrome at all.
import { Badge, Box, Container, Flex, Heading, Tabs, Text } from "@radix-ui/themes";
import { adminData, NOW } from "./admin-data.ts";
import { PeopleTable } from "./people-table.component.tsx";
import { GuestRunsTable } from "./guest-runs-table.component.tsx";
import { FeedbackTable } from "./feedback-table.component.tsx";
import { ErrorsTable } from "./errors-table.component.tsx";

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <Flex gap="2" align="center">
      <Text size="2">{label}</Text>
      <Text size="2" color="gray">{count}</Text>
    </Flex>
  );
}

export function AdminPage() {
  const { users, guestRuns, feedback, errors } = adminData;
  const openErrors = errors.filter((e) => !e.resolved).length;
  return (
    <Box minHeight="100dvh" style={{ background: "var(--gray-2)" }}>
      <Container size="3" px="4" py="6">
        <Flex align="center" gap="3" mb="6" wrap="wrap">
          <img src="/brandmark.svg" alt="Sero" width={30} height={30} />
          <Heading size="6" weight="medium">Admin</Heading>
          <Badge size="2" radius="full" variant="soft" color="violet">ui 2 · demo data</Badge>
          <Box flexGrow="1" />
          <Text size="2" color="gray">
            {users.filter((u) => !u.deactivated).length} active people · {guestRuns.length} guest runs · {openErrors} open {openErrors === 1 ? "error" : "errors"}
          </Text>
        </Flex>

        <Tabs.Root defaultValue="people">
          <Tabs.List size="2">
            <Tabs.Trigger value="people"><TabLabel label="People" count={users.length} /></Tabs.Trigger>
            <Tabs.Trigger value="guest-runs"><TabLabel label="Guest runs" count={guestRuns.length} /></Tabs.Trigger>
            <Tabs.Trigger value="feedback"><TabLabel label="Feedback" count={feedback.length} /></Tabs.Trigger>
            <Tabs.Trigger value="errors"><TabLabel label="Errors" count={openErrors} /></Tabs.Trigger>
          </Tabs.List>
          <Box pt="4">
            <Tabs.Content value="people"><PeopleTable users={users} now={NOW} /></Tabs.Content>
            <Tabs.Content value="guest-runs"><GuestRunsTable runs={guestRuns} now={NOW} /></Tabs.Content>
            <Tabs.Content value="feedback"><FeedbackTable items={feedback} now={NOW} /></Tabs.Content>
            <Tabs.Content value="errors"><ErrorsTable errors={errors} now={NOW} /></Tabs.Content>
          </Box>
        </Tabs.Root>
      </Container>
    </Box>
  );
}
