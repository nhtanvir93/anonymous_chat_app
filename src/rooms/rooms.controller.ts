import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';
import { AppException } from 'src/app-exception/app-exception';
import type { Request } from 'express';

const ROOM_NOT_FOUND = 'ROOM_NOT_FOUND';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomService: RoomsService) {}

  @Post()
  async create(@Body() dto: CreateRoomDto, @Req() request: Request) {
    const room = await this.roomService.createRoom(dto, request.userId!);

    return {
      success: true,
      data: {
        ...room,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const room = await this.roomService.findRoomById(id);

    if (!room) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ROOM_NOT_FOUND,
        `Room with id ${id} does not exist`,
      );
    }

    return {
      success: true,
      data: {
        ...room,
      },
    };
  }
}
