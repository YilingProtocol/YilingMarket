// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FixedPointMath
/// @notice WAD (1e18) fixed-point math library for cross-entropy scoring
/// @dev Based on PRBMath ln() implementation adapted for prediction market scoring
library FixedPointMath {
    uint256 internal constant WAD = 1e18;
    int256 internal constant iWAD = 1e18;

    // ln(2) in WAD
    int256 internal constant LN2 = 693147180559945309;

    /// @notice Calculates the natural logarithm of x in WAD format
    /// @param x Input value in WAD (must be > 0)
    /// @return result ln(x) in WAD (signed, since ln(x<1) is negative)
    function ln(uint256 x) internal pure returns (int256 result) {
        require(x > 0, "LN_ZERO");

        // We use the identity: ln(x) = log2(x) * ln(2)
        // First compute log2(x) in WAD

        int256 xInt = int256(x);

        // When x >= 1 (WAD), log2 is non-negative
        // When x < 1 (WAD), log2 is negative

        // Find the integer part of log2
        // Normalize x to [1, 2) range in WAD
        int256 log2Result = 0;

        // Handle x >= WAD case: shift right to find integer part
        if (xInt >= iWAD) {
            uint256 temp = x;
            while (temp >= 2 * WAD) {
                temp /= 2;
                log2Result += iWAD;
            }
            xInt = int256(temp);
        } else {
            // x < WAD: shift left
            uint256 temp = x;
            while (temp < WAD) {
                temp *= 2;
                log2Result -= iWAD;
            }
            xInt = int256(temp);
        }

        // Now xInt is in [WAD, 2*WAD)
        // Compute fractional part using repeated squaring
        // log2(x) = integer_part + fractional_part
        int256 delta = int256(WAD / 2);
        for (uint256 i = 0; i < 60; i++) {
            // Square x and normalize
            xInt = (xInt * xInt) / iWAD;

            if (xInt >= 2 * iWAD) {
                xInt /= 2;
                log2Result += delta;
            }
            delta /= 2;

            if (delta == 0) break;
        }

        // Convert log2 to ln: ln(x) = log2(x) * ln(2)
        result = (log2Result * LN2) / iWAD;
    }

    /// @notice Cross-entropy score S(q, p) = q * ln(p) + (1-q) * ln(1-p)
    /// @param q Reference probability in WAD (the "true" outcome)
    /// @param p Predicted probability in WAD
    /// @return score Cross-entropy score in WAD (always negative or zero)
    function crossEntropyScore(uint256 q, uint256 p) internal pure returns (int256 score) {
        require(p > 0 && p < WAD, "P_OUT_OF_RANGE");
        require(q <= WAD, "Q_OUT_OF_RANGE");

        int256 lnP = ln(p);
        int256 lnOneMinusP = ln(WAD - p);

        int256 qSigned = int256(q);
        int256 oneMinusQ = iWAD - qSigned;

        score = (qSigned * lnP + oneMinusQ * lnOneMinusP) / iWAD;
    }

    /// @notice Delta payout: difference between two cross-entropy scores
    /// @param qFinal Final reference probability (last prediction)
    /// @param pBefore Price before this prediction
    /// @param pAfter Price after this prediction (= this prediction)
    /// @return delta S(qFinal, pAfter) - S(qFinal, pBefore)
    function deltaPayout(
        uint256 qFinal,
        uint256 pBefore,
        uint256 pAfter
    ) internal pure returns (int256 delta) {
        int256 scoreAfter = crossEntropyScore(qFinal, pAfter);
        int256 scoreBefore = crossEntropyScore(qFinal, pBefore);
        delta = scoreAfter - scoreBefore;
    }

    /// @notice Multiply two WAD numbers
    function wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b) / WAD;
    }

    /// @notice Divide two WAD numbers
    function wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * WAD) / b;
    }
}
