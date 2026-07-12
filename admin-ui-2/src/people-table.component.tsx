import { Avatar, Badge, Flex, Table, Text } from "@radix-ui/themes";
import type { RegUser } from "./admin.types.ts";
import { timeAgo } from "./time-ago.ts";

const roleColor = { admin: "violet", manager: "sky", member: "gray" } as const;

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("");
}

// Runs this week next to a quiet up/down vs last week. No arrow glyphs: the
// signed delta says it plainly.
function Trend({ now, before }: { now: number; before: number }) {
  const delta = now - before;
  if (delta === 0) return <Text size="2" color="gray">±0</Text>;
  return (
    <Text size="2" color={delta > 0 ? "green" : "tomato"}>
      {delta > 0 ? `+${delta}` : delta}
    </Text>
  );
}

export function PeopleTable({ users, now }: { users: RegUser[]; now: number }) {
  if (users.length === 0) return <Text size="2" color="gray">No one has registered yet.</Text>;
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Person</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Runs this week</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Last active</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {users.map((u) => (
          <Table.Row key={u.id} style={u.deactivated ? { opacity: 0.55 } : undefined}>
            <Table.RowHeaderCell>
              <Flex align="center" gap="3">
                <Avatar size="2" radius="full" fallback={initials(u.name)} />
                <Flex direction="column">
                  <Text size="2" weight="medium">{u.name}</Text>
                  <Text size="2" color="gray">{u.email}</Text>
                </Flex>
              </Flex>
            </Table.RowHeaderCell>
            <Table.Cell>{u.company}</Table.Cell>
            <Table.Cell>
              <Flex gap="2">
                <Badge size="2" radius="full" color={roleColor[u.role]}>{u.role}</Badge>
                {u.deactivated && <Badge size="2" radius="full" color="gray" variant="soft">deactivated</Badge>}
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex gap="2" align="center">
                <Text size="2">{u.runsThisWeek}</Text>
                <Trend now={u.runsThisWeek} before={u.runsLastWeek} />
              </Flex>
            </Table.Cell>
            <Table.Cell><Text size="2" color="gray">{timeAgo(u.lastActiveAt, now)}</Text></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
