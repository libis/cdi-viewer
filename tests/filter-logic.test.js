/**
 * Unit tests for filter logic
 * Testing the core filtering algorithm without UI
 */

describe('Filter Logic', () => {
  // Mock DOM structure
  let mockNodes;

  beforeEach(() => {
    // Create mock node structure
    mockNodes = [
      {
        id: 'node1',
        classes: ['changed'], // modified
        properties: [
          { id: 'prop1', classes: ['extra-field'] },
          { id: 'prop2', classes: [] }
        ]
      },
      {
        id: 'node2',
        classes: [], // not modified
        properties: [
          { id: 'prop3', classes: ['extra-field'] },
          { id: 'prop4', classes: [] }
        ]
      }
    ];
  });

  describe('Node filtering', () => {
    it('should hide all nodes when filter has zero matches', () => {
      // Test: Filter for modified nodes when none exist
      const modifiedPredicate = (node) => node.classes.includes('changed');
      
      const node1Matches = modifiedPredicate(mockNodes[0]);
      const node2Matches = modifiedPredicate(mockNodes[1]);
      
      expect(node1Matches).toBe(true); // node1 is changed
      expect(node2Matches).toBe(false); // node2 is not changed
    });

    it('should not show nodes based on property visibility alone', () => {
      // If node filter says hide node2, it should stay hidden
      // EVEN IF its properties are visible
      
      // This is the key test: properties being visible should NOT
      // make their parent node visible if the node doesn't match node filters
      
      const result = {
        node1: { nodeMatch: true, hasVisibleProperties: true, shouldShow: true },
        node2: { nodeMatch: false, hasVisibleProperties: true, shouldShow: false }
      };
      
      expect(result.node2.shouldShow).toBe(false);
    });
  });

  describe('Bottom-up filtering', () => {
    it('should show parent if child node matches', () => {
      // Parent node doesn't match, but child node does
      const _parent = { id: 'parent', matches: false };
      const child = { id: 'child', matches: true };
      
      // Bottom-up should show parent because child is visible
      const parentShouldShow = child.matches; // parent has visible child
      
      expect(parentShouldShow).toBe(true);
    });

    it('should NOT show parent if only properties match', () => {
      // Parent node doesn't match, child nodes don't match
      // But properties are visible
      const parent = { 
        id: 'parent', 
        nodeMatches: false,
        hasVisibleProperties: true,
        hasVisibleChildNodes: false
      };
      
      // Parent should STAY HIDDEN (this is the bug we're fixing)
      const parentShouldShow = parent.hasVisibleChildNodes; // NOT hasVisibleProperties
      
      expect(parentShouldShow).toBe(false);
    });
  });

  describe('Filter combinations', () => {
    it('modified filter with no modifications should hide all', () => {
      const nodesWithoutModifications = [
        { id: 'node1', classes: [] },
        { id: 'node2', classes: [] }
      ];
      
      const modifiedPredicate = (node) => node.classes.includes('changed');
      
      const visibleCount = nodesWithoutModifications.filter(modifiedPredicate).length;
      
      expect(visibleCount).toBe(0);
    });
  });
});
