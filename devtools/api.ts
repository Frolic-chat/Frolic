/**
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * This file is an implementation of an api; it contains only as much of the api as necessary to implement it. The application of this file's license to those elements may be limited. The purpose of this use is to provide a debugging interface using local-to-local communication... ie "spoofing" the server so the client behavior can be tested.
 *
 * Additionally, because this implementation is as dirt-cheap as I could think of, it may be highly similar to whatever implementation you could come up with.
 */

export const ServerCommandKeys = [ 'ADL', 'AOP', 'BRO', 'CBU', 'CDS', 'CHA', 'CIU', 'CKU', 'COA', 'COL', 'CON', 'COR', 'CSO', 'CTU', 'DOP', 'ERR', 'FKS', 'FLN', 'FRL', 'HLO', 'ICH', 'IDN', 'IGN', 'JCH', 'KID', 'LCH', 'LIS', 'LRP', 'MSG', 'NLN', 'ORS', 'PIN', 'PRD', 'PRI', 'RLL', 'RMO', 'RTB', 'SFC', 'STA', 'SYS', 'TPN', 'UPT', 'VAR', 'ZZZ' ] as const;

export const ServerCommandData = [
'{"ops": ReadonlyArray<string>}', // ADL
'{"character": string}', // AOP
'{"message": string, "character": string?}', // BRO
'{"operator": string, "channel": string, "character": string}', // CBU
'{"channel": string, "description": string}', // CDS
'{"channels": ReadonlyArray<{"name": string, "mode": Channel.Mode, "characters": number}>}', // CHA
'{"sender": string, "title": string, "name": string}', // CIU
'{"operator": string, "channel": string, "character": string}', // CKU
'{"character": string, "channel": string}', // COA
'{"channel": string, "oplist": ReadonlyArray<string>}', // COL
'{"count": number}', // CON
'{"character": string, "channel": string}', // COR
'{"character": string, "channel": string}', // CSO
'{"operator": string, "channel": string, "length": number, "character": string}', // CTU
'{"character": string}', // DOP
'{"number": number, "message": string}', // ERR
'{"characters": ReadonlyArray<string>, "kinks": ReadonlyArray<number>}', // FKS
'{"character": string}', // FLN
'{"characters": ReadonlyArray<string>}', // FRL
'{"message": string}', // HLO
'{"users": ReadonlyArray<{"identity": string}>, "channel": string, "mode": Channel.Mode}', // ICH
'{"character": string}', // IDN
'{"action": "add | delete", "character": string} | {"action": "list | init", "characters": ReadonlyArray<string>}', // IGN
'{"channel": string, "character": {"identity": string}, "title": string}', // JCH
'{"type": "start | end", "message": string} | {"type": "custom", "key": number, "value": number}', // KID
'{"channel": string, "character": string}', // LCH
'{"characters": ReadonlyArray<[string, Character.Gender, Character.Status, string]>}', // LIS
'{"character": string, "message": string, "channel": string}', // LRP
'{"character": string, "message": string, "channel": string}', // MSG
'{"identity": string, "gender": Character.Gender, "status": "online"}', // NLN
'{"channels": ReadonlyArray<{"name": string, "title": string, "characters": number}>}', // ORS
'undefined', // PIN
'{"type": "start | end", "message": string} | {"type": "info | select", "key": string, "value": string}', // PRD
'{"character": string, "message": string}', // PRI
'{"type": "dice", "results": ReadonlyArray<number>, "message": string, "rolls": ReadonlyArray<string>, "character": string, "endresult": number, "channel": string} | {"type": "dice", "results": ReadonlyArray<number>, "message": string, "rolls": ReadonlyArray<string>, "character": string, "endresult": number, "recipient": string} | {"type": "bottle", "message": string, "character": string, "target": string, "channel": string} | {"type": "bottle", "message": string, "character": string, "target": string, "recipient": string}', // RLL
'{"mode": Channel.Mode, "channel": string}', // RMO
'{"type": "comment", "target_type": "newspost | bugreport | changelog | feature", "id": number, "target_id": number, "parent_id": number, "name": string, "target": string} | {"type": "note", "sender": string, "subject": string, "id": number} | {"type": "grouprequest | bugreport | helpdeskticket | helpdeskreply | featurerequest", "name": string, "id": number, "title": string?} | {"type": "trackadd | trackrem | friendadd | friendremove | friendrequest", "name": string}', // RTB
'{"action": "confirm", "moderator": string, "character": string, "timestamp": string, "tab": string, "logid": number} | {"callid": number, "action": "report", "report": string, "timestamp": string, "character": string, "tab": string, "logid": number, "old": ?true}', // SFC
'{"status": Character.Status, "character": string, "statusmsg": string}', // STA
'{"message": string, "channel": string?}', // SYS
'{"character": string, "status": Character.TypingStatus}', // TPN
'{"time": number, "starttime": number, "startstring": string, "accepted": number, "channels": number, "users": number, "maxusers": number}', // UPT
'{"variable": string, "value": number | ReadonlyArray<string>}', // VAR
'{"message": string}', // ZZZ
] as const;

const ServerCommandMap: { [key: string]: string } = {};
for (let i = 0; i < ServerCommandKeys.length; i++) {
    ServerCommandMap[ServerCommandKeys[i]] = ServerCommandData[i];
}
export { ServerCommandMap }
