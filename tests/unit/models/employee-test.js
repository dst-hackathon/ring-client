import { moduleForModel, test } from 'ember-qunit';

moduleForModel('employee', 'Unit | Model | employee', {
  // Specify the other units that are required for this test.
  // needs: ['model:subordinate']
});

test('it exists', function(assert) {
  var model = this.subject();
  // var store = this.store();
  assert.ok(!!model);
});
