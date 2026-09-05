import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.types';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

async function runAuthTests() {
  console.info('🧪 Starting NBE Auth & RBAC Verification Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.info(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Successful Login for USER
  try {
    const res = await AuthService.login('owner@nbe.com.eg', 'Password123!');
    assert(!!res.token, 'User login returns JWT token');
    assert(res.user.role === UserRole.USER, 'User has role USER');
    assert(res.user.email === 'owner@nbe.com.eg', 'User email matches');

    // Verify token payload
    const decoded = jwt.verify(res.token, env.JWT_SECRET) as jwt.JwtPayload;
    assert(decoded.role === UserRole.USER, 'Token payload contains role USER');
    assert(decoded.userId === res.user.id, 'Token payload contains userId');
  } catch (e) {
    assert(false, `User login threw error: ${(e as Error).message}`);
  }

  // Test 2: Successful Login for CHECKER
  try {
    const res = await AuthService.login('checker@nbe.com.eg', 'Password123!');
    assert(res.user.role === UserRole.CHECKER, 'Checker user has role CHECKER');
  } catch (e) {
    assert(false, `Checker login threw error: ${(e as Error).message}`);
  }

  // Test 3: Successful Login for ADMIN
  try {
    const res = await AuthService.login('admin@nbe.com.eg', 'Password123!');
    assert(res.user.role === UserRole.ADMIN, 'Admin user has role ADMIN');
  } catch (e) {
    assert(false, `Admin login threw error: ${(e as Error).message}`);
  }

  // Test 4: Rejection on Wrong Password
  try {
    await AuthService.login('owner@nbe.com.eg', 'WrongPassword999!');
    assert(false, 'Login with wrong password should have failed');
  } catch (e) {
    assert((e as Error).message.includes('Invalid'), 'Wrong password rejected with 401 message');
  }

  // Test 5: Rejection on Non-existent User
  try {
    await AuthService.login('unknown.user@nbe.com.eg', 'Password123!');
    assert(false, 'Login with unknown user should have failed');
  } catch (e) {
    assert((e as Error).message.includes('Invalid'), 'Unknown user rejected with 401 message');
  }

  // Test 6: Token Verification & Decode
  try {
    const res = await AuthService.login('checker@nbe.com.eg', 'Password123!');
    const verified = AuthService.verifyToken(res.token);
    assert(verified.email === 'checker@nbe.com.eg', 'Token verification succeeds');
  } catch (e) {
    assert(false, `Token verification failed: ${(e as Error).message}`);
  }

  // Test 7: Invalid Token Rejection
  try {
    AuthService.verifyToken('invalid.tampered.token');
    assert(false, 'Tampered token should have failed verification');
  } catch (e) {
    assert((e as Error).message.includes('Invalid'), 'Tampered token correctly rejected');
  }

  console.info(`\n📊 Auth Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Fatal error during auth test run:', err);
  process.exit(1);
});
