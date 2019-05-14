import log from 'loglevel';
import queryString from 'query-string';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { LinterProviderInfo } from '../LinterProvider';
import { ApplicationState } from '../../reducers';
import { ConnectedReduxProps } from '../../configureStore';
import {
  FileTree,
  RelativePathPosition,
  getTree,
  goToRelativeFile,
  goToRelativeMessage,
} from '../../reducers/fileTree';
import { LinterMessage } from '../../reducers/linter';
import {
  CompareInfo,
  actions as versionsActions,
  goToRelativeDiff,
} from '../../reducers/versions';
import styles from './styles.module.scss';
import { gettext } from '../../utils';

const keys = ['k', 'j', 'e', 'o', 'c', 'n', 'p', 'a', 'z'];

export type PublicProps = {
  compareInfo: CompareInfo | null | void;
  currentPath: string;
  messageMap: LinterProviderInfo['messageMap'];
  versionId: number;
};

type PropsFromState = {
  currentAnchor: string;
  messageUid: LinterMessage['uid'];
  pathList: FileTree['pathList'] | void;
};

export type DefaultProps = {
  _document: typeof document;
  _goToRelativeDiff: typeof goToRelativeDiff;
  _goToRelativeFile: typeof goToRelativeFile;
  _goToRelativeMessage: typeof goToRelativeMessage;
};

type Props = RouteComponentProps &
  PropsFromState &
  PublicProps &
  DefaultProps &
  ConnectedReduxProps;

export class KeyboardShortcutsBase extends React.Component<Props> {
  static defaultProps: DefaultProps = {
    _document: document,
    _goToRelativeDiff: goToRelativeDiff,
    _goToRelativeFile: goToRelativeFile,
    _goToRelativeMessage: goToRelativeMessage,
  };

  keydownListener = (event: KeyboardEvent) => {
    const {
      _goToRelativeDiff,
      _goToRelativeFile,
      _goToRelativeMessage,
      compareInfo,
      currentAnchor,
      currentPath,
      dispatch,
      messageMap,
      messageUid,
      pathList,
      versionId,
    } = this.props;

    if (!pathList) {
      log.warn('Ignoring keyboard events while fileTree.pathList is undefined');
      return;
    }

    if (
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      keys.includes(event.key)
    ) {
      switch (event.key) {
        case 'k':
          dispatch(
            _goToRelativeFile({
              currentPath,
              pathList,
              position: RelativePathPosition.previous,
              versionId,
            }),
          );
          break;
        case 'j':
          dispatch(
            _goToRelativeFile({
              currentPath,
              pathList,
              position: RelativePathPosition.next,
              versionId,
            }),
          );
          break;
        // We are supporting 'e' as it was the shortcut from the old tool, hence
        // existing reviewers might be used to using it.
        case 'e':
        case 'o':
          dispatch(
            versionsActions.expandTree({
              versionId,
            }),
          );
          break;
        case 'c':
          dispatch(
            versionsActions.collapseTree({
              versionId,
            }),
          );
          break;
        case 'n':
          if (compareInfo) {
            dispatch(
              _goToRelativeDiff({
                currentAnchor,
                diff: compareInfo.diff,
                pathList,
                position: RelativePathPosition.next,
                versionId,
              }),
            );
          } else {
            log.warn('Cannot navigate to next change without diff loaded');
          }
          break;
        case 'p':
          if (compareInfo) {
            dispatch(
              _goToRelativeDiff({
                currentAnchor,
                diff: compareInfo.diff,
                pathList,
                position: RelativePathPosition.previous,
                versionId,
              }),
            );
          } else {
            log.warn('Cannot navigate to previous change without diff loaded');
          }
          break;
        case 'z':
          if (messageMap) {
            dispatch(
              _goToRelativeMessage({
                currentMessageUid: messageUid,
                currentPath,
                messageMap,
                pathList,
                position: RelativePathPosition.next,
                versionId,
              }),
            );
          }
          break;
        case 'a':
          if (messageMap) {
            dispatch(
              _goToRelativeMessage({
                currentMessageUid: messageUid,
                currentPath,
                messageMap,
                pathList,
                position: RelativePathPosition.previous,
                versionId,
              }),
            );
          }
          break;
        default:
      }
    }
  };

  componentDidMount() {
    const { _document } = this.props;

    _document.addEventListener('keydown', this.keydownListener);
  }

  componentWillUnmount() {
    const { _document } = this.props;

    _document.removeEventListener('keydown', this.keydownListener);
  }

  render() {
    const { compareInfo } = this.props;
    const diffKeysClassName = !compareInfo ? styles.disabled : '';

    return (
      <div className={styles.KeyboardShortcuts}>
        <dl className={styles.definitions}>
          <dt>
            <kbd>k</kbd>
          </dt>
          <dd>{gettext('Up file')}</dd>
          <dt>
            <kbd>j</kbd>
          </dt>
          <dd>{gettext('Down file')}</dd>
          <dt className={diffKeysClassName}>
            <kbd>p</kbd>
          </dt>
          <dd className={diffKeysClassName}>{gettext('Previous change')}</dd>
          <dt className={diffKeysClassName}>
            <kbd>n</kbd>
          </dt>
          <dd className={diffKeysClassName}>{gettext('Next change')}</dd>
          <dt>
            <kbd>a</kbd>
          </dt>
          <dd>{gettext('Previous message')}</dd>
          <dt>
            <kbd>z</kbd>
          </dt>
          <dd>{gettext('Next message')}</dd>
          <dt>
            <kbd>o</kbd>
          </dt>
          <dd>{gettext('Open all folders')}</dd>
          <dt>
            <kbd>c</kbd>
          </dt>
          <dd>{gettext('Close all folders')}</dd>
        </dl>
      </div>
    );
  }
}

const mapStateToProps = (
  state: ApplicationState,
  ownProps: PublicProps & RouteComponentProps,
): PropsFromState => {
  const { location, versionId } = ownProps;
  const { messageUid } = queryString.parse(location.search);

  const tree = getTree(state.fileTree, versionId);
  if (!tree) {
    // TODO: Do not rely on <FileTree> to actually load the data.
    // This will be fixed in:
    // https://github.com/mozilla/addons-code-manager/issues/678
    log.warn(`No tree was loaded for version:`, versionId);
  }

  return {
    currentAnchor: location.hash.replace(/^#/, ''),
    messageUid: typeof messageUid === 'string' ? messageUid : '',
    pathList: tree && tree.pathList,
  };
};

export default withRouter(
  connect(mapStateToProps)(KeyboardShortcutsBase),
) as React.ComponentType<PublicProps & Partial<DefaultProps>>;
