// SPDX-License-Identifier: MIT
// Delivered by Kaizen.finance

pragma solidity ^0.8.21;

interface IAntiBot {
    function onPreTransferCheck(
        address operator,
        address from,
        address to,
        uint256 amount
    ) external;
}
