import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { roleLabel } from '../../lib/paths.ts';
import type { WorkspaceDetail, WorkspaceMember } from '../../types/index.ts';

function WorkspaceMembers({
  workspace,
  members,
}: {
  workspace: WorkspaceDetail;
  members: WorkspaceMember[];
}) {
  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="People in this workspace"
        description="Invitations are not available yet. The list shows people who already belong to this workspace, and their roles."
      />
      <WorkspaceNav workspace={workspace} current="members" />
      <ul className="grid gap-3">
        {members.map((member) => (
          <li key={member.id}>
            <Card className="flex items-center justify-between gap-3">
              <h2 className="text-lg text-ink">{member.name}</h2>
              <Badge tone={member.role === 'owner' ? 'accent' : 'neutral'}>
                {roleLabel(member.role)}
              </Badge>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

appPage(WorkspaceMembers, (props) => `${props.workspace.name} members`);

export default WorkspaceMembers;
