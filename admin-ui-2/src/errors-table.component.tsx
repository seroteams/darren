import { Badge, Flex, Table, Text } from "@radix-ui/themes";
import type { ErrorItem } from "./admin.types.ts";
import { timeAgo } from "./time-ago.ts";

export function ErrorsTable({ errors, now }: { errors: ErrorItem[]; now: number }) {
  if (errors.length === 0) return <Text size="2" color="gray">Nothing has broken. Enjoy it.</Text>;
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>What happened</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Seen</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Last</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {errors.map((e) => (
          <Table.Row key={e.id}>
            <Table.Cell>
              <Badge size="2" radius="full" color={e.resolved ? "gray" : "tomato"} variant="soft">
                {e.resolved ? "resolved" : "open"}
              </Badge>
            </Table.Cell>
            <Table.RowHeaderCell>
              <Flex direction="column">
                <Text size="2" weight="medium">{e.message}</Text>
                <Text size="2" color="gray">{e.where}</Text>
              </Flex>
            </Table.RowHeaderCell>
            <Table.Cell>{e.count === 1 ? "once" : `${e.count} times`}</Table.Cell>
            <Table.Cell><Text size="2" color="gray">{timeAgo(e.lastSeenAt, now)}</Text></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
