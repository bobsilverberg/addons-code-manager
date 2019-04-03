/* eslint @typescript-eslint/camelcase: 0 */
import * as React from 'react';
import { shallow } from 'enzyme';
import Treefold from 'react-treefold';
import { ListGroup } from 'react-bootstrap';

import configureStore from '../../configureStore';
import {
  DirectoryNode,
  buildFileTree,
  getRootPath,
} from '../../reducers/fileTree';
import {
  actions as versionActions,
  createInternalVersion,
  createInternalVersionEntry,
  getVersionInfo,
} from '../../reducers/versions';
import {
  createFakeLogger,
  createVersionWithEntries,
  fakeVersion,
  fakeVersionEntry,
  shallowUntilTarget,
  spyOn,
} from '../../test-helpers';
import { getLocalizedString } from '../../utils';
import { getTreefoldRenderProps } from '../FileTreeNode/index.spec';
import FileTreeNode from '../FileTreeNode';
import Loading from '../Loading';

import FileTree, {
  FileTreeBase,
} from '.';

describe(__filename, () => {

  describe('FileTree', () => {
    const getVersion = ({
      store = configureStore(),
      version = fakeVersion,
    }) => {
      store.dispatch(versionActions.loadVersionInfo({ version }));

      return getVersionInfo(store.getState().versions, version.id);
    };

    const render = ({
      _log = createFakeLogger(),
      onSelect = jest.fn(),
      store = configureStore(),
      versionId = 1234,
    } = {}) => {
      return shallowUntilTarget(
        <FileTree _log={_log} versionId={versionId} onSelect={onSelect} />,
        FileTreeBase,
        {
          shallowOptions: { context: { store } },
        },
      );
    };

    it('renders a ListGroup component with a Treefold', () => {
      const store = configureStore();
      const version = getVersion({ store });

      const root = render({ store, versionId: version.id });

      expect(root.find(ListGroup)).toHaveLength(1);
      expect(root.find(Treefold)).toHaveLength(1);
      expect(root.find(Treefold)).toHaveProp('nodes', [buildFileTree(version)]);
    });

    it('passes the onSelect prop to FileTreeNode', () => {
      const store = configureStore();
      const version = getVersion({ store });
      const onSelect = jest.fn();

      const root = render({ onSelect, store, versionId: version.id });

      const node = (root.instance() as FileTreeBase).renderNode(
        getTreefoldRenderProps(),
      );

      expect(shallow(<div>{node}</div>).find(FileTreeNode)).toHaveProp(
        'onSelect',
        onSelect,
      );
    });

    it('passes the version prop to FileTreeNode', () => {
      const store = configureStore();
      const version = getVersion({ store });

      const root = render({ store, versionId: version.id });

      const node = (root.instance() as FileTreeBase).renderNode(
        getTreefoldRenderProps(),
      );

      expect(shallow(<div>{node}</div>).find(FileTreeNode)).toHaveProp(
        'version',
        version,
      );
    });

    it('dispatches toggleExpandedPath when onToggleExpand is called', () => {
      const store = configureStore();
      const version = getVersion({ store });
      const node = {
        id: 'some/path',
        name: 'some name',
        children: [],
      };

      const dispatch = spyOn(store, 'dispatch');

      const root = render({ store, versionId: version.id });

      const treeFold = root.find(Treefold);
      expect(treeFold).toHaveProp('onToggleExpand');

      const onToggleExpand = treeFold.prop('onToggleExpand');
      onToggleExpand(node);

      expect(dispatch).toHaveBeenCalledWith(
        versionActions.toggleExpandedPath({
          path: node.id,
          versionId: version.id,
        }),
      );
    });

    it('recognizes a node as expanded when it has been added to expandedPaths', () => {
      const store = configureStore();
      const node = {
        id: 'some/path',
        name: 'some name',
        children: [],
      };
      let version = getVersion({ store });

      store.dispatch(
        versionActions.toggleExpandedPath({
          path: node.id,
          versionId: version.id,
        }),
      );

      version = getVersionInfo(store.getState().versions, version.id);

      const root = render({ store, versionId: version.id });

      const treeFold = root.find(Treefold);
      expect(treeFold).toHaveProp('isNodeExpanded');

      const isNodeExpanded = treeFold.prop('isNodeExpanded');
      expect(isNodeExpanded(node)).toBeTruthy();
    });

    it('recognizes a node as not expanded when it has not been added to expandedPaths', () => {
      const store = configureStore();
      const node = {
        id: 'some/path',
        name: 'some name',
        children: [],
      };
      const version = getVersion({ store });

      const root = render({ store, versionId: version.id });

      const treeFold = root.find(Treefold);
      expect(treeFold).toHaveProp('isNodeExpanded');

      const isNodeExpanded = treeFold.prop('isNodeExpanded');
      expect(isNodeExpanded(node)).toBeFalsy();
    });

    it('logs a warning message when no version is loaded', () => {
      const _log = createFakeLogger();

      render({ _log });

      expect(_log.warn).toHaveBeenCalled();
    });

    it('renders a Loading component when no version is loaded', () => {
      const root = render();

      expect(root.find(Loading)).toHaveLength(1);
    });

    it('returns a Loading component from renderNode when no version is loaded', () => {
      const root = render();

      const node = (root.instance() as FileTreeBase).renderNode(
        getTreefoldRenderProps(),
      );

      expect(shallow(<div>{node}</div>).find(Loading)).toHaveLength(1);
    });

    it('throws an error when isNodeExpanded is called without a version', () => {
      const node = {
        id: 'some/path',
        name: 'some name',
        children: [],
      };
      const root = render();

      const { isNodeExpanded } = root.instance() as FileTreeBase;

      expect(() => {
        isNodeExpanded(node);
      }).toThrow('Cannot check if node is expanded without a version');
    });

    it('throws an error when onToggleExpand is called without a version', () => {
      const node = {
        id: 'some/path',
        name: 'some name',
        children: [],
      };
      const root = render();

      const { onToggleExpand } = root.instance() as FileTreeBase;

      expect(() => {
        onToggleExpand(node);
      }).toThrow('Cannot toggle expanded path without a version');
    });

    it('dispatches expandTree when the Expand All button is clicked', () => {
      const store = configureStore();
      const version = getVersion({ store });

      const dispatch = spyOn(store, 'dispatch');

      const root = render({ store, versionId: version.id });

      root.find('#openAll').simulate('click');

      expect(dispatch).toHaveBeenCalledWith(
        versionActions.expandTree({
          versionId: version.id,
        }),
      );
    });

    it('dispatches collapseTree when the Collapse All button is clicked', () => {
      const store = configureStore();
      const version = getVersion({ store });

      const dispatch = spyOn(store, 'dispatch');

      const root = render({ store, versionId: version.id });

      root.find('#closeAll').simulate('click');

      expect(dispatch).toHaveBeenCalledWith(
        versionActions.collapseTree({
          versionId: version.id,
        }),
      );
    });
  });
});
