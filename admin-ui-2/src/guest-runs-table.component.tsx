import { Table, Text } from "@radix-ui/themes";
import type { GuestRun } from "./admin.types.ts";
import { timeAgo } from "./time-ago.ts";

export function GuestRunsTable({ runs, now }: { runs: GuestRun[]; now: number }) {
  if (runs.length === 0) return <Text size="2" color="gray">No guest runs yet.</Text>;
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Persona</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Meeting</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Rating</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {runs.map((r) => (
          <Table.Row key={r.id}>
            <Table.RowHeaderCell><Text size="2" weight="medium">{r.persona}</Text></Table.RowHeaderCell>
            <Table.Cell>{r.meetingType}</Table.Cell>
            <Table.Cell>
              {r.stars == null
                ? <Text size="2" color="gray">not rated</Text>
                : <Text size="2">{r.stars} / 5</Text>}
            </Table.Cell>
            <Table.Cell><Text size="2" color="gray">{timeAgo(r.createdAt, now)}</Text></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
