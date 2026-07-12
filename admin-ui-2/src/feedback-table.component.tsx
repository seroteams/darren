import { Table, Text } from "@radix-ui/themes";
import type { FeedbackItem } from "./admin.types.ts";
import { timeAgo } from "./time-ago.ts";

export function FeedbackTable({ items, now }: { items: FeedbackItem[]; now: number }) {
  if (items.length === 0) return <Text size="2" color="gray">No feedback yet.</Text>;
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>From</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Rating</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Comment</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {items.map((f) => (
          <Table.Row key={f.id}>
            <Table.RowHeaderCell><Text size="2" weight="medium">{f.from}</Text></Table.RowHeaderCell>
            <Table.Cell>
              <Text size="2" color={f.stars <= 2 ? "tomato" : undefined}>{f.stars} / 5</Text>
            </Table.Cell>
            <Table.Cell style={{ maxWidth: 480 }}>{f.comment}</Table.Cell>
            <Table.Cell><Text size="2" color="gray">{timeAgo(f.createdAt, now)}</Text></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
