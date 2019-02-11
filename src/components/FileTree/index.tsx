import * as React from 'react';
import Treefold, { TreefoldRenderProps } from 'react-treefold';

import { gettext } from '../../utils';
import styles from './styles.module.scss';
import { Version, VersionEntryType } from '../../reducers/versions';

type FileNode = {
  id: string;
  name: string;
};

type DirectoryNode = {
  id: string;
  name: string;
  children: TreeNode[];
};

type TreeNode = FileNode | DirectoryNode;

export const buildFileTree = (
  versionId: string,
  entries: Version['entries'],
): DirectoryNode => {
  const root: DirectoryNode = {
    id: `root-${versionId}`,
    name: versionId,
    children: [],
  };

  // We need to know how depth the tree is because we'll build the Treebeard
  // tree depth by depth.
  const maxDepth = entries.reduce((max, entry) => {
    if (entry.depth > max) {
      return entry.depth;
    }

    return max;
  }, 0);

  let currentDepth = 0;
  while (currentDepth <= maxDepth) {
    // We find the entries for the current depth.
    const currentEntries = entries.filter(
      // eslint-disable-next-line no-loop-func
      (entry) => entry.depth === currentDepth,
    );

    // This is where we create new "nodes" for each entry.
    // eslint-disable-next-line no-loop-func
    currentEntries.forEach((entry) => {
      let currentNode = root;

      if (currentDepth > 0) {
        // We need to find the current node (directory) to add the current
        // entry in its children. We do this by splitting the `path` attribute
        // and visit each node until we reach the desired node.
        //
        // This only applies when the current depth is not 0 (a.k.a. the root
        // directory) because we already know `root`.
        const parts = entry.path.split('/');
        // Remove the filename
        parts.pop();

        for (let i = 0; i < parts.length; i++) {
          const foundNode = currentNode.children.find(
            (child: TreeNode) => child.name === parts[i],
          ) as DirectoryNode;

          if (foundNode) {
            currentNode = foundNode;
          }

          // TODO: this should not happen but what if we don't find a node?
        }
      }

      // Create a new node.
      let node: TreeNode = {
        id: entry.path,
        name: entry.filename,
      };

      // When the entry is a directory, we create a `DirectoryNode`.
      if (entry.type === VersionEntryType.directory) {
        node = {
          ...node,
          children: [],
        };
      }

      currentNode.children.push(node);
    });

    // To the next depth.
    currentDepth++;
  }

  return root;
};

type PublicProps = {
  version: Version;
};

export class FileTreeBase extends React.Component<PublicProps> {
  renderNode = (props: TreefoldRenderProps<TreeNode>) => {
    const {
      node,
      level,
      isFolder,
      isExpanded,
      getToggleProps,
      hasChildNodes,
      renderChildNodes,
    } = props;

    return (
      <React.Fragment>
        <div className={styles.node} style={{ paddingLeft: `${level * 20}px` }}>
          {isFolder ? (
            <span {...getToggleProps()} className={styles.directoryNode}>
              {node.name}&nbsp;/
            </span>
          ) : (
            <span>{node.name}</span>
          )}
        </div>

        {isExpanded &&
          (hasChildNodes ? (
            renderChildNodes()
          ) : (
            <div
              className={styles.emptyNodeDirectory}
              style={{ paddingLeft: `${(level + 1) * 20}px` }}
            >
              {gettext('This folder is empty')}
            </div>
          ))}
      </React.Fragment>
    );
  };

  render() {
    const { version } = this.props;

    const tree = buildFileTree(`${version.id}`, version.entries);

    // eslint-disable-next-line react/jsx-props-no-multi-space
    return <Treefold nodes={[tree]} render={this.renderNode} />;
  }
}

export default FileTreeBase;
