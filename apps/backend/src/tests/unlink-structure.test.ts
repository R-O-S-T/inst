import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { unlinkAccount } from '@unlink-xyz/sdk';

describe('unlink.ts dependencies — verify SDK is usable', () => {
  it('can generate a BIP-39 mnemonic', () => {
    const mnemonic = generateMnemonic(wordlist);
    const words = mnemonic.split(' ');
    assert.equal(words.length, 12, 'mnemonic should be 12 words');
    assert.ok(words.every((w) => w.length > 0), 'all words should be non-empty');
  });

  it('can derive an Unlink account from a mnemonic', () => {
    const mnemonic = generateMnemonic(wordlist);
    const account = unlinkAccount.fromMnemonic({ mnemonic });
    assert.ok(account, 'should return an account object');
  });

  it('different mnemonics produce different accounts', () => {
    const m1 = generateMnemonic(wordlist);
    const m2 = generateMnemonic(wordlist);
    assert.notEqual(m1, m2, 'two random mnemonics should differ');

    const a1 = unlinkAccount.fromMnemonic({ mnemonic: m1 });
    const a2 = unlinkAccount.fromMnemonic({ mnemonic: m2 });
    assert.notDeepEqual(a1, a2, 'accounts from different mnemonics should differ');
  });

  it('same mnemonic produces the same account (deterministic)', () => {
    const mnemonic = generateMnemonic(wordlist);
    const a1 = unlinkAccount.fromMnemonic({ mnemonic });
    const a2 = unlinkAccount.fromMnemonic({ mnemonic });
    assert.deepEqual(a1, a2, 'same mnemonic should produce identical account');
  });
});

describe('unlink.ts exports — gift wallet functions only', () => {
  it('exports generateGiftWallet', async () => {
    const mod = await import('../services/unlink.js');
    assert.equal(typeof mod.generateGiftWallet, 'function');
  });

  it('exports transferFromGiftWallet', async () => {
    const mod = await import('../services/unlink.js');
    assert.equal(typeof mod.transferFromGiftWallet, 'function');
  });

  it('exports getGiftWalletBalance', async () => {
    const mod = await import('../services/unlink.js');
    assert.equal(typeof mod.getGiftWalletBalance, 'function');
  });

  it('no longer exports old user-facing functions', async () => {
    const mod = await import('../services/unlink.js') as Record<string, unknown>;
    assert.equal(mod.generateUserMnemonic, undefined);
    assert.equal(mod.transferToUser, undefined);
    assert.equal(mod.getBalance, undefined);
    assert.equal(mod.depositToPool, undefined);
    assert.equal(mod.withdrawToEvm, undefined);
  });
});
