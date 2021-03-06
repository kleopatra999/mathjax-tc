/*************************************************************
 *
 *  Copyright (c) 2015-2016 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * @fileoverview A simple Semantic output visitor.
 *
 * @author v.sorge@mathjax.org (Volker Sorge)
 */

/// <reference path="semantic.d.ts" />

import {Visitor, AbstractVisitor} from './visitor';
import {TreeNode, Kind, Tag} from './tree_node';
import {LeafNode, EmptyNode} from './leaf_node';
import * as nf from './node_factory';
import sem = require('semantic');

export class SemanticVisitor extends AbstractVisitor {

  private factory: sem.NodeFactory;
  private result: sem.Tree = sem.emptyTree();
  private childrenStack: sem.Node[][] = [[]];

  /**
   * @constructor
   * @extends {AbstractVisitor}
   */
  constructor() {
    super();
    this.factory = new sem.NodeFactory();
    sem.Processor.setFactory(this.factory);
  }

  /**
   * @return {SemanticTree} The semantic tree.
   */
  public getResult(): sem.Tree {
    this.result.root = this.childrenStack[0][0];
    return this.result;
  }

  /**
   * @override
   */
  protected visitNodeMi(node: nf.NodeMi) {
    let attributes = node.getAttributes();
    let semNode = sem.Processor.identifierNode(
      node.getText(), attributes['mathvariant'], attributes['class']);
    this.walkLeafNode(semNode, node, super.visitNodeMi.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMo(node: nf.NodeMo) {
    let semNode = this.factory.makeLeafNode(
      node.getText(), node.getAttributes()['mathvariant']);
    if (semNode.type === sem.Type.UNKNOWN) {
      semNode.type = sem.Type.OPERATOR;
    }
    // TODO: Do we need this for leaf nodes?
    this.walkLeafNode(semNode, node, super.visitNodeMo.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMn(node: nf.NodeMn) {
    let semNode = this.factory.makeLeafNode(
      node.getText(), node.getAttributes()['mathvariant']);
    sem.Processor.number(semNode);
    this.walkLeafNode(semNode, node, super.visitNodeMn.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMtext(node: nf.NodeMtext) {
    this.textNode('MTEXT', node, super.visitNodeMtext.bind(this));
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMspace(node: nf.NodeMspace) {
  //   super.visitNodeMspace(node);
  // }

  /**
   * @override
   */
  protected visitNodeMs(node: nf.NodeMs) {
    this.textNode('MS', node, super.visitNodeMs.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMrow(node: nf.NodeMrow) {
    this.inferredRow(node, super.visitNodeMrow.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMfrac(node: nf.NodeMfrac) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        return sem.Processor.fractionLikeNode(
          node.getAttributes()['linethickness'], children[0], children[1]);
      }, super.visitNodeMfrac.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMsqrt(node: nf.NodeMsqrt) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        return this.factory.makeBranchNode(
          sem.Type.SQRT, [sem.Processor.row(children)], []);
      }.bind(this),
      super.visitNodeMsqrt.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMroot(node: nf.NodeMroot) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        return this.factory.makeBranchNode(
      sem.Type.ROOT, [children[1], children[0]], []);
      }.bind(this),
      super.visitNodeMroot.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMstyle(node: nf.NodeMstyle) {
    this.inferredRow(node, super.visitNodeMstyle.bind(this));
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMerror(node: nf.NodeMerror) {
  //   super.visitNodeMerror(node);
  // }

  /**
   * @override
   */
  protected visitNodeMpadded(node: nf.NodeMpadded) {
    this.inferredRow(node, super.visitNodeMpadded.bind(this));
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMphantom(node: nf.NodeMphantom) {
  //   super.visitNodeMphantom(node);
  // }

  /**
   * @override
   */
  protected visitNodeMfenced(node: nf.NodeMfenced) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        let attributes = node.getAttributes();
        let sepValue = this.getAttributeDefault(attributes, 'separators', ',');
        let open = this.getAttributeDefault(attributes, 'open', '(');
        let close = this.getAttributeDefault(attributes, 'close', ')');
        return sem.Processor.mfenced(open, close, sepValue, children);
      }.bind(this),
      super.visitNodeMfenced.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMenclose(node: nf.NodeMenclose) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        let semNode = this.factory.makeBranchNode(
          sem.Type.ENCLOSE, [sem.Processor.row(children)], []);
        semNode.role = node.getAttributes()['notation'] || sem.Role.UNKNOWN;
        return semNode;
      }.bind(this),
      super.visitNodeMenclose.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMsub(node: nf.NodeMsub) {
    this.limitNode('MSUB', node, super.visitNodeMsub.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMsup(node: nf.NodeMsup) {
    this.limitNode('MSUP', node, super.visitNodeMsup.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMsubsup(node: nf.NodeMsubsup) {
    this.limitNode('MSUBSUP', node, super.visitNodeMsubsup.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMunder(node: nf.NodeMunder) {
    this.limitNode('MUNDER', node, super.visitNodeMunder.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMover(node: nf.NodeMover) {
    this.limitNode('MOVER', node, super.visitNodeMover.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeMunderover(node: nf.NodeMunderover) {
    this.limitNode('MUNDEROVER', node, super.visitNodeMunderover.bind(this));
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMmultiscripts(node: nf.NodeMmultiscripts) {
  //   super.visitNodeMmultiscripts(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMprescripts(node: nf.NodeMprescripts) {
  //   super.visitNodeMprescripts(node);
  // }

  /**
   * @override
   */
  protected visitNodeMtable(node: nf.NodeMtable) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        let semNode = this.factory.makeBranchNode(sem.Type.TABLE, children, []);
        sem.Processor.tableToMultiline(semNode);
        return semNode;
      }.bind(this),
      super.visitNodeMtable.bind(this)
    );
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMlabeledtr(node: nf.NodeMlabeledtr) {
  //   super.visitNodeMlabeledtr(node);
  // }

  /**
   * @override
   */
  protected visitNodeMtr(node: nf.NodeMtr) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        let semNode = this.factory.makeBranchNode(sem.Type.ROW, children, []);
        semNode.role = sem.Role.TABLE;
        return semNode;
      }.bind(this),
      super.visitNodeMtr.bind(this)
    );
  }

  /**
   * @override
   */
  protected visitNodeMtd(node: nf.NodeMtd) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        let semNode = this.factory.makeBranchNode(
          sem.Type.CELL, [sem.Processor.row(children)], []);
        semNode.role = sem.Role.TABLE;
        return semNode;
      }.bind(this),
      super.visitNodeMtd.bind(this)
    );
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeMaligngroup(node: nf.NodeMaligngroup) {
  //   super.visitNodeMaligngroup(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMalignmark(node: nf.NodeMalignmark) {
  //   super.visitNodeMalignmark(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMstack(node: nf.NodeMstack) {
  //   super.visitNodeMstack(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMlongdiv(node: nf.NodeMlongdiv) {
  //   super.visitNodeMlongdiv(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMsgroup(node: nf.NodeMsgroup) {
  //   super.visitNodeMsgroup(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMsrow(node: nf.NodeMsrow) {
  //   super.visitNodeMsrow(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMscarries(node: nf.NodeMscarries) {
  //   super.visitNodeMscarries(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMscarry(node: nf.NodeMscarry) {
  //   super.visitNodeMscarry(node);
  // }

  // /**
  //  * @override
  //  */
  // protected visitNodeMsline(node: nf.NodeMsline) {
  //   super.visitNodeMsline(node);
  // }

  /**
   * @override
   */
  protected visitNodeMaction(node: nf.NodeMaction) {
    if (node.getChildren().length <= 1) {
      this.appendChild(this.factory.makeUnprocessed(node));
      return;
    }
    this.visitNode(node.getChildren()[1]);
  }

  /**
   * @override
   */
  protected visitNodeMath(node: nf.NodeMath) {
    this.inferredRow(node, super.visitNodeMath.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeSemantics(node: nf.NodeSemantics) {
    node.getChildren().length ?
      super.visitNodeSemantics(node) :
      this.appendChild(this.factory.makeEmptyNode());
  }

  /**
   * @override
   */
  protected visitNodeAnnotation(node: nf.NodeAnnotation) {
    this.appendChild(this.factory.makeEmptyNode());
  }

  /**
   * @override
   */
  protected visitNodeAnnotationXml(node: nf.NodeAnnotationXml) {
    this.textNode('ANNOTATION-XML', node,
                  super.visitNodeAnnotationXml.bind(this));
  }

  /**
   * @override
   */
  protected visitNodeNone(node: nf.NodeNone) {
    this.appendChild(this.factory.makeEmptyNode());
  }

  // /**
  //  * @override
  //  */
  // protected visitNodeDummy(node: nf.NodeDummy) {
  //   super.visitNodeDummy(node);
  // }

  /**
   * Adds a level to the child structure.
   */
  private stackChildren() {
    this.childrenStack.unshift([]);
  }

  /**
   * Removes the current level from the child structure.
   */
  private unstackChildren() {
    return this.childrenStack.shift();
  }

  /**
   * Appends a node at the current level in the child structure.
   * @param {sem.Node} node The semantic node that forms the new child.
   */
  private appendChild(node: sem.Node) {
    this.childrenStack[0].push(node);
  }

  /**
   * Wrapper method for tree walking branch nodes handling operation on the
   * children stack.
   * @param {TreeNode} node The branch node to transform.
   * @param {function(TreeNode, Array.<sem.Node>): sem.Node} exec Method to
   *     execute that transforms the branch node and connects it to already
   *     computed semantic children.
   * @param {function(TreeNode)} func The call to the superclass method to
   *     continue walking.
   */
private walkWithStack(
    node: TreeNode,
    exec: (node: TreeNode, children: sem.Node[]) => sem.Node,
    func: (node: TreeNode) => void) {
    this.stackChildren();
    func(node);
    let children = this.unstackChildren();
    let semNode = exec(node, children);
    this.appendChild(semNode);
  }

  /**
   * Processes semantic limit nodes (e.g., sub/superscripts, over/unders).
   * @param {string} tag The original MathML tag name.
   * @param {TreeNode} node The limit node itself.
   * @param {function(TreeNode)} func The call to the superclass method.
   * @private
   */
  private limitNode(tag: string, node: TreeNode,
                    func: (node: TreeNode) => void) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        return sem.Processor.limitNode(tag, children);
      },
      func);
  }

  /**
   * Processes inferred rows (e.g. mrows, math elements).
   * @param {TreeNode} node The row node itself.
   * @param {function(TreeNode)} func The call to the superclass method.
   * @private
   */
  private inferredRow(node: TreeNode, func: (node: TreeNode) => void) {
    this.walkWithStack(
      node,
      function(node: TreeNode, children: sem.Node[]): sem.Node {
        return children.length !== 1 ?
          sem.Processor.row(children) : children[0];
      }, func);
  }

  /**
   * Processes text like nodes.
   * @param {string} tag The original MathML tag name.
   * @param {LeafNode} node The text node itself.
   * @param {function(LeafNode)} func The call to the superclass method.
   * @private
   */
  private textNode(tag: string, node: LeafNode,
                   func: (node: LeafNode) => void) {
    let semNode = sem.Processor.text(
      node.getText(), node.getAttributes()['mathvariant'], tag);
    this.walkLeafNode(semNode, node, func);
  }

  /**
   * Wrapper method for tree walking on leaf nodes.
   * @param {sem.Node} node The semantic node that is the leaf.
   * @param {LeafNode} node The leaf node of the MathML tree.
   * @param {function(LeafNode)} func The call to the superclass method.
   * @private
   */
  private walkLeafNode(semNode: sem.Node, node: LeafNode,
                       func: (node: LeafNode) => void) {
    this.appendChild(semNode);
    this.stackChildren();
    func(node);
    this.unstackChildren();
  }

  /**
   * Retrieves an attribute for a node or returns a default value if attribute
   * does not exist.
   * @param {Object.<string, string>} attributes The attributes of the node.
   * @param {string} attr The attribute key to retrieve.
   * @param {string} def The default return value.
   * @return {string} The attribute value.
   */
  private getAttributeDefault(
    attributes: {[kind: string]: string}, attr: string, def: string) {
    let value = attributes[attr];
    if (value === undefined) {
      return def;
    }
    if (value.match(/^\s*$/)) {
      return null;
    }
    return value;
  };

}
